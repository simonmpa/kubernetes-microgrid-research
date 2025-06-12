package nodenumber

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"slices"
	"strconv"
	"time"

	"golang.org/x/xerrors"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/klog/v2"
	"k8s.io/kubernetes/pkg/scheduler/framework"
	frameworkruntime "k8s.io/kubernetes/pkg/scheduler/framework/runtime"
)

type NodeNumber struct {
	fh framework.Handle
	// if reverse is true, it favors nodes that doesn't have the same number suffix.
	//
	// For example:
	// When schedule a pod named Pod1, a Node named Node1 gets a lower score than a node named Node9.
	reverse bool
}

var (
	_ framework.ScorePlugin    = &NodeNumber{}
	_ framework.PreScorePlugin = &NodeNumber{}
	_ framework.PostBindPlugin = &NodeNumber{}
)

const (
	// Name is the name of the plugin used in the plugin registry and configurations.
	Name             = "NodeNumber"
	preScoreStateKey = "PreScore" + Name
	gridStateKey     = "GridState" + Name
)

// Name returns the name of the plugin. It is used in logs, etc.
func (pl *NodeNumber) Name() string {
	return Name
}

// preScoreState computed at PreScore and used at Score.
type preScoreState struct {
	podSuffixNumber int
}

type gridState struct {
	podSuffixNumber int
}

type LocationData struct {
	Current_load      float64 `json:"Current_load"`
	Current_renewable float64 `json:"Current_renewable"`
	Gridname          string  `json:"Gridname"`
	SOC               float64 `json:"SOC"`
	Timestamp         string  `json:"Timestamp"`
}

type Response struct {
	State []LocationData `json:"state"`
}

// Clone implements the mandatory Clone interface. We don't really copy the data since
// there is no need for that.
func (s *preScoreState) Clone() framework.StateData {
	return s
}

func (pl *NodeNumber) PreScore(ctx context.Context, state *framework.CycleState, pod *v1.Pod, nodes []*framework.NodeInfo) *framework.Status {
	klog.InfoS("execute PreScore on NodeNumber plugin", "pod", klog.KObj(pod))

	podNameLastChar := pod.Name[len(pod.Name)-1:]
	podnum, err := strconv.Atoi(podNameLastChar)
	if err != nil {
		// return success even if its suffix is non-number.
		return nil
	}

	s := &preScoreState{
		podSuffixNumber: podnum,
	}
	state.Write(preScoreStateKey, s)

	return nil
}

func (pl *NodeNumber) EventsToRegister() []framework.ClusterEvent {
	return []framework.ClusterEvent{
		{Resource: framework.Node, ActionType: framework.Add},
	}
}

var ErrNotExpectedPreScoreState = errors.New("unexpected pre score state")

type PostBody struct {
	Node         string  `json:"Node"`
	CPU          float64 `json:"CPU"`
	Completed_at string  `json:"Completed_at"`
}

func (pl *NodeNumber) PostBind(ctx context.Context, state *framework.CycleState, p *v1.Pod, nodeName string) {
	// Data to send
	annotations := p.GetAnnotations()
	fmt.Println("Annotation: ", ConvertToDBTimestamp(annotations["stage-delay"]))

	//get cpu avg
	avg_cpu_str := p.ObjectMeta.Annotations["avg-cpu"]
	avg_cpu, err := strconv.ParseFloat(avg_cpu_str, 64)
	if err != nil {
		avg_cpu = 2.2
	}

	body := PostBody{
		Node:         nodeName,
		CPU:          avg_cpu,
		Completed_at: ConvertToDBTimestamp(annotations["stage-delay"])}

	// Convert data to JSON
	jsonData, _ := json.Marshal(body)

	fmt.Println("Postbind sending:", body)

	// Make the POST request
	resp, err := http.Post("http://host.docker.internal:5000/schedule-job", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Postbind Error:", err)
		return
	}
	defer resp.Body.Close()
}

// Score invoked at the score extension point.
func (pl *NodeNumber) Score(ctx context.Context, state *framework.CycleState, pod *v1.Pod, nodeName string) (int64, *framework.Status) {

	//Returning 0 for all, to test effect of not using plugin
	//return 0, nil

	apiData, apierr, x := GetData()

	if apierr != nil {
		klog.InfoS("api fail")
		return int64(x), nil
	}

	nodeList, _ := pl.fh.SnapshotSharedLister().NodeInfos().List()
	idx := slices.IndexFunc(nodeList, func(n *framework.NodeInfo) bool { return n.Node().Name == nodeName })
	location := nodeList[idx].Node().Labels["location"]
	fmt.Println("Before GetLocationData ", location)
	LocationData := GetLocationData(location, apiData)
	fmt.Println("After GetLocationData found ", LocationData.Gridname)
	renewDiff := (LocationData.Current_renewable - LocationData.Current_load) / LocationData.Current_load

	renewScore := 100 / (1.0 + math.Pow(math.E, (-0.05*100*renewDiff)))
	fmt.Println("Returning a score :D")

	// 0 is battery minimum charge. Prev 20
	return int64(math.Round(renewScore)*0.5 + (math.Round(LocationData.SOC)-0)*0.5), nil

}

func GetLocationBatteryCharge(loc string, data []LocationData) float64 {
	idx := slices.IndexFunc(data, func(d LocationData) bool { return d.Gridname == loc })
	return data[idx].SOC
}

func GetLocationData(loc string, data []LocationData) LocationData {
	idx := slices.IndexFunc(data, func(d LocationData) bool { return d.Gridname == loc })
	return data[idx]
}

var lastApiCall time.Time
var currentLocationData []LocationData

func GetData() ([]LocationData, error, int) {

	fmt.Println("GETTING THE DATA LAURITS")
	now := time.Now()
	if lastApiCall.IsZero() || now.Sub(lastApiCall) >= 10*time.Second {
		resp, err := http.Get("http://host.docker.internal:5000/soc")
		if err != nil {
			return nil, err, 0
		}

		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err, 1
		}
		var data Response
		err = json.Unmarshal(body, &data)

		if err != nil {
			return nil, err, 2
		}
		currentLocationData = data.State
		lastApiCall = now
	}
	fmt.Println("Returning data :D")
	return currentLocationData, nil, 3
}

func ConvertToDBTimestamp(timestamp string) string {
	parsedTime, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		fmt.Println("Error parsing RFC3339 timestamp:", err)
		return "error"
	}

	//Convert back to our timezone
	parsedTime = parsedTime.Add(time.Hour * 2)

	formattedTimestamp := parsedTime.Format("2006-01-02 15:04:05")

	return formattedTimestamp
}

// ScoreExtensions of the Score plugin.
func (pl *NodeNumber) ScoreExtensions() framework.ScoreExtensions {
	return nil
}

// New initializes a new plugin and returns it.
func New(ctx context.Context, arg runtime.Object, h framework.Handle) (framework.Plugin, error) {
	typedArg := NodeNumberArgs{Reverse: false}
	if arg != nil {
		err := frameworkruntime.DecodeInto(arg, &typedArg)
		if err != nil {
			return nil, xerrors.Errorf("decode arg into NodeNumberArgs: %w", err)
		}
		klog.Info("NodeNumberArgs is successfully applied")
	}
	return &NodeNumber{fh: h, reverse: typedArg.Reverse}, nil
}

// NodeNumberArgs is arguments for node number plugin.
//
//nolint:revive
type NodeNumberArgs struct {
	metav1.TypeMeta

	Reverse bool `json:"reverse"`
}
