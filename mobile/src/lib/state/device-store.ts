// Stores *this device's* identity — which creator on the shared backend this
// phone is signed in as. Persisted so the user only registers once.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DeviceStore {
  creatorId: string | null;
  setCreatorId: (id: string | null) => void;
}

const useDeviceStore = create<DeviceStore>()(
  persist(
    (set) => ({
      creatorId: null,
      setCreatorId: (id) => set({ creatorId: id }),
    }),
    {
      name: "device-identity",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useDeviceStore;
