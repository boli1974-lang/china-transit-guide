export interface ChinaTransitPort {
  region: string;
  portName: string;
  portType: 'airport' | 'seaport' | 'rail' | 'land';
  permittedStayArea: string;
  notes?: string;
  source: string;
}

export const chinaTransitPorts: ChinaTransitPort[] = [];
