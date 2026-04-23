import { memo, type ReactNode } from "react";


type LoadableProps = {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
};

function LoadableImpl({ isLoading, skeleton, children }: LoadableProps) {
  return isLoading ? <>{skeleton}</> : <>{children}</>;
}

export const Loadable = memo(LoadableImpl);

