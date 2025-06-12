import { reactive, inject } from "@nuxtjs/composition-api";
import { V1PriorityClass } from "@kubernetes/client-node";
import { PriorityClassAPIKey } from "~/api/APIProviderKeys";
import {
  createResourceState,
  addResourceToState,
  modifyResourceInState,
  deleteResourceInState,
} from "./helpers/storeHelper";
import { WatchEventType } from "@/types/resources";

type stateType = {
  selectedPriorityClass: selectedPriorityClass | null;
  priorityclasses: V1PriorityClass[];
  lastResourceVersion: string;
};

type selectedPriorityClass = {
  // isNew represents whether this is a new PriorityClass or not.
  isNew: boolean;
  item: V1PriorityClass;
  resourceKind: string;
  isDeletable: boolean;
};

export default function priorityclassStore() {
  const state: stateType = reactive({
    selectedPriorityClass: null,
    priorityclasses: [],
    lastResourceVersion: "",
  });

  const priorityClassAPI = inject(PriorityClassAPIKey);
  if (!priorityClassAPI) {
    throw new Error(`${PriorityClassAPIKey.description} is not provided`);
  }

  // `CheckIsDeletable` returns whether the given PriorityClass can be deleted or not.
  // The PriorityClasses that have the name prefixed with `system-` are reserved by the system so can't be deleted.
  const checkIsDeletable = (p: V1PriorityClass) => {
    return !!p.metadata?.name && !p.metadata?.name?.startsWith("system-");
  };

  return {
    get priorityclasses() {
      return state.priorityclasses;
    },

    get count(): number {
      return state.priorityclasses.length;
    },

    get selected() {
      return state.selectedPriorityClass;
    },

    select(pc: V1PriorityClass | null, isNew: boolean) {
      if (pc !== null) {
        state.selectedPriorityClass = {
          isNew: isNew,
          item: pc,
          resourceKind: "PC",
          isDeletable: checkIsDeletable(pc),
        };
      }
    },

    resetSelected() {
      state.selectedPriorityClass = null;
    },

    async apply(pc: V1PriorityClass) {
      if (pc.metadata?.name) {
        await priorityClassAPI.applyPriorityClass(pc);
      } else if (pc.metadata?.generateName) {
        // This PriorityClass can be expected to be a newly created PriorityClass. So, use `createPriorityClass` instead.
        await priorityClassAPI.createPriorityClass(pc);
      } else {
        throw new Error(
          "failed to apply priorityclass: priorityclass should have metadata.name or metadata.generateName"
        );
      }
    },

    async fetchSelected() {
      if (
        state.selectedPriorityClass?.item.metadata?.name &&
        !this.selected?.isNew
      ) {
        const s = await priorityClassAPI.getPriorityClass(
          state.selectedPriorityClass.item.metadata.name
        );
        this.select(s, false);
      }
    },

    async delete(p: V1PriorityClass) {
      if (p.metadata?.name) {
        await priorityClassAPI.deletePriorityClass(p.metadata.name);
      } else {
        throw new Error(
          "failed to delete priorityclass: priorityclass should have metadata.name"
        );
      }

    },

    // initList calls list API, and stores current resource data and lastResourceVersion.
    async initList() {
      const listpriorityclasses = await priorityClassAPI.listPriorityClass();
      state.priorityclasses = createResourceState<V1PriorityClass>(
        listpriorityclasses.items
      );
      state.lastResourceVersion =
        listpriorityclasses.metadata?.resourceVersion!;
    },

    // watchEventHandler handles each notified event.
    async watchEventHandler(eventType: WatchEventType, pc: V1PriorityClass) {
      switch (eventType) {
        case WatchEventType.ADDED: {
          state.priorityclasses = addResourceToState(state.priorityclasses, pc);
          break;
        }
        case WatchEventType.MODIFIED: {
          state.priorityclasses = modifyResourceInState(
            state.priorityclasses,
            pc
          );
          break;
        }
        case WatchEventType.DELETED: {
          state.priorityclasses = deleteResourceInState(
            state.priorityclasses,
            pc
          );
          break;
        }
        default:
          break;
      }
    },

    get lastResourceVersion() {
      return state.lastResourceVersion;
    },

    async setLastResourceVersion(pc: V1PriorityClass) {
      state.lastResourceVersion =
        pc.metadata!.resourceVersion || state.lastResourceVersion;
    },
  };
}

export type PriorityClassStore = ReturnType<typeof priorityclassStore>;
