import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { moduleFederationShared } from '@iobroker/gui-components/modulefederation.admin.config';
const shared=moduleFederationShared(['react','react-dom','@iobroker/gui-components','@iobroker/json-config']);
for(const value of Object.values(shared)) value.import=false;
export default {
 plugins:[federation({manifest:true,dts:false,name:'WastemanagerSet',filename:'customComponents.js',exposes:{'./Components':'./src/Components.jsx'},shared}),react()],
 base:'./',build:{target:'chrome89',outDir:'../admin/custom',emptyOutDir:true}
};

