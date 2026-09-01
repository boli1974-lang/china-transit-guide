export interface ChinaTransitPort {
  region: string;
  portName: string;
  portType: 'airport' | 'seaport' | 'rail' | 'land';
  permittedStayArea: string;
  notes?: string;
  source: string;
}

export const chinaTransitPorts: ChinaTransitPort[] = [
  {
    region: 'Beijing',
    portName: 'Beijing Capital International Airport',
    portType: 'airport',
    permittedStayArea: 'Beijing Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Beijing',
    portName: 'Beijing Daxing International Airport',
    portType: 'airport',
    permittedStayArea: 'Beijing Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Tianjin',
    portName: 'Tianjin Binhai International Airport',
    portType: 'airport',
    permittedStayArea: 'Tianjin Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Tianjin',
    portName: 'Tianjin Port (Passenger)',
    portType: 'seaport',
    permittedStayArea: 'Tianjin Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Hebei',
    portName: 'Shijiazhuang Zhengding International Airport',
    portType: 'airport',
    permittedStayArea: 'Hebei Province',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Hebei',
    portName: 'Qinhuangdao Port (Passenger)',
    portType: 'seaport',
    permittedStayArea: 'Hebei Province',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Liaoning',
    portName: 'Shenyang Taoxian International Airport',
    portType: 'airport',
    permittedStayArea: 'Liaoning Province',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Liaoning',
    portName: 'Dalian Zhoushuizi International Airport',
    portType: 'airport',
    permittedStayArea: 'Liaoning Province',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Liaoning',
    portName: 'Dalian Port (Passenger)',
    portType: 'seaport',
    permittedStayArea: 'Liaoning Province',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Shanghai',
    portName: 'Shanghai Hongqiao International Airport',
    portType: 'airport',
    permittedStayArea: 'Shanghai Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Shanghai',
    portName: 'Shanghai Pudong International Airport',
    portType: 'airport',
    permittedStayArea: 'Shanghai Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },
  {
    region: 'Shanghai',
    portName: 'Shanghai Port (Passenger)',
    portType: 'seaport',
    permittedStayArea: 'Shanghai Municipality',
    source: 'NIA 240-hour visa-free transit port list',
  },];
