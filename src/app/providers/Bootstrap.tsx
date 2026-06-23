import { useEffect } from "react";
import { featureThunks } from "@/store/features";
import { useAppDispatch } from "@/hooks/redux";

export function Bootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    featureThunks.forEach((thunk) => {
      void dispatch(thunk() as unknown as Parameters<typeof dispatch>[0]);
    });
  }, [dispatch]);

  return children;
}
