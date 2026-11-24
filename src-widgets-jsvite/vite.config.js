import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { moduleFederationShared } from '@iobroker/types-vis-2/modulefederation.vis.config';
const shared=moduleFederationShared(['react','react-dom']);
for(const value of Object.values(shared)) value.import=false;
export default {
 plugins:[federation({manifest:true,dts:false,name:'vis2WastemanagerWidgets',filename:'customWidgets.js',exposes:{'./WasteBinWidget':'./src/WasteBinWidget.jsx','./translations':'./src/translations.js'},shared}),react()],
 base:'./',build:{target:'chrome89',outDir:'../widgets/wastemanager',emptyOutDir:true}
};
