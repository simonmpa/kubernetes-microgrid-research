import { reactive, inject } from "@nuxtjs/composition-api";
import { V1StorageClass } from "@kubernetes/client-node";
import { StorageClassAPIKey } from "~/api/APIProviderKeys";
import {
  createResourceState,
  addResourceToState,
  modifyResourceInState,
  deleteResourceInState,
} from "./helpers/storeHelper";
import { WatchEventType } from "@/types/resources";

type stateType = {
  selectedStorageClass: selectedStorageClass | null;
  storageclasses: V1StorageClass[];
  lastResourceVersion: string;
};

type selectedStorageClass = {
  // isNew represents whether this is a new StorageClass or not.
  isNew: boolean;
  item: V1StorageClass;
  resourceKind: string;
  isDeletable: boolean;
};

export default function storageclassStore() {
  const state: stateType = reactive({
    selectedStorageClass: null,
    storageclasses: [],
    lastResourceVersion: "",
  });

  const storageClassAPI = inject(StorageClassAPIKey);
  if (!storageClassAPI) {
    throw new Error(`${StorageClassAPIKey.description} is not provided`);
  }

  return {
    get storageclasses() {
      return state.storageclasses;
    },

    get count(): number {
      return state.storageclasses.length;
    },

    get selected() {
      return state.selectedStorageClass;
    },

    select(sc: V1StorageClass | null, isNew: boolean) {
      if (sc !== null) {
        state.selectedStorageClass = {
          isNew: isNew,
          item: sc,
          resourceKind: "SC",
          isDeletable: true,
        };
      }
    },

    resetSelected() {
      state.selectedStorageClass = null;
    },

    async apply(sc: V1StorageClass) {
      if (sc.metadata?.name) {
        await storageClassAPI.applyStorageClass(sc);
      } else if (sc.metadata?.generateName) {
        // This StorageClass can be expected to be a newly created StorageClass. So, use `createStorageClass` instead.
        await storageClassAPI.createStorageClass(sc);
      } else {
        throw new Error(
          "failed to apply storageclass: storageclass should have metadata.name or metadata.generateName"
        );
      }
    },

    async fetchSelected() {
      if (
        state.selectedStorageClass?.item.metadata?.name &&
        !this.selected?.isNew
      ) {
        const s = await storageClassAPI.getStorageClass(
          state.selectedStorageClass.item.metadata.name
        );
        this.select(s, false);
      }
    },

    async delete(sc: V1StorageClass) {
      if (sc.metadata?.name) {
        await storageClassAPI.deleteStorageClass(sc.metadata.name);
      } else {
        throw new Error(
          "failed to delete storageclass: storageclass should have metadata.name"
        );
      }
    },

    // initList calls list API, and stores current resource data and lastResourceVersion.
    async initList() {
      const liststorageclasses = await storageClassAPI.listStorageClass();
      state.storageclasses = createResourceState<V1StorageClass>(
        liststorageclasses.items
      );
      state.lastResourceVersion = liststorageclasses.metadata?.resourceVersion!;
    },

    // watchEventHandler handles each notified event.
    async watchEventHandler(eventType: WatchEventType, sc: V1StorageClass) {
      switch (eventType) {
        case WatchEventType.ADDED: {
          state.storageclasses = addResourceToState(state.storageclasses, sc);
          break;
        }
        case WatchEventType.MODIFIED: {
          state.storageclasses = modifyResourceInState(
            state.storageclasses,
            sc
          );
          break;
        }
        case WatchEventType.DELETED: {
          state.storageclasses = deleteResourceInState(
            state.storageclasses,
            sc
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

    async setLastResourceVersion(sc: V1StorageClass) {
      state.lastResourceVersion =
        sc.metadata!.resourceVersion || state.lastResourceVersion;
    },
  };
}

export type StorageClassStore = ReturnType<typeof storageclassStore>;
