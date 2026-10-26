export type ContainerStatus = 'normal' | 'warning' | 'full';

export type Bin = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity_kg: number;
  fill_percent: number;
  status: ContainerStatus;
  waste_type: string;
  last_update: string;
};
