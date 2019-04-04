/*!!!!!!!!!!!Do not change anything between here (the DRIVERNAME placeholder will be automatically replaced at buildtime)!!!!!!!!!!!*/
import NodeDriver from 'shared/mixins/node-driver';

// do not remove LAYOUT, it is replaced at build time with a base64 representation of the template of the hbs template
// we do this to avoid converting template to a js file that returns a string and the cors issues that would come along with that
const LAYOUT;
/*!!!!!!!!!!!DO NOT CHANGE END!!!!!!!!!!!*/

const NET_MODEL_CHOICES = [
  { 'name':  'Intel e1000',              'value': 'e1000'   },
  { 'name':  'virtio (Paravirtualized)', 'value': 'virtio'  },  
  { 'name':  'Realtek RTL8139',          'value': 'rtl8139' },
  { 'name':  'VMware vmxnet3',           'value': 'vmxnet3' },
];

const STORAGE_TYPE_CHOICES = [
  { 'name': 'QCOW2', 'value': 'qcow2' },
  { 'name': 'RAW',   'value': 'raw'   },
]; 

// Not sure if we are going to set FS TYPES.... Just in case will leave this const here.
const FS_TYPE_CHOICES = [
  { 'name': 'Ceph FS',      'value': 'cephfs'      },
  { 'name': 'Cifs',         'value': 'cifs'        },
  { 'name': 'Directory',    'value': 'dir'         },
  { 'name': 'DRDB',         'value': 'drdb'        },
  { 'name': 'Fake',         'value': 'fake'        },
  { 'name': 'Gluster FS',   'value': 'glusterfs'   },
  { 'name': 'iSCSI',        'value': 'iscsi'       },
  { 'name': 'iSCSI Direct', 'value': 'iscsidirect' },
  { 'name': 'LVM',          'value': 'lvm'         },
  { 'name': 'LVM Thin',     'value': 'lvmthin'     },
  { 'name': 'NFS',          'value': 'nfs'         },
  { 'name': 'RBD',          'value': 'rbd'         },
  { 'name': 'Sheepdog',     'value': 'sheepdog'    },
  { 'name': 'ZFS',          'value': 'zfs'         },
  { 'name': 'ZFS Pool',     'value': 'zfspool'     },
];

/*!!!!!!!!!!!GLOBAL CONST START!!!!!!!!!!!*/
// EMBER API Access - if you need access to any of the Ember API's add them here in the same manner rather then import them via modules, since the dependencies exist in rancher we dont want to expor the modules in the amd def
const computed      = Ember.computed;
const get           = Ember.get;
const set           = Ember.set;
const alias         = Ember.computed.alias;
const service       = Ember.inject.service;

const setProperties = Ember.setProperties;

/*!!!!!!!!!!!GLOBAL CONST END!!!!!!!!!!!*/

/*!!!!!!!!!!!DO NOT CHANGE START!!!!!!!!!!!*/
export default Ember.Component.extend(NodeDriver, {
  driverName:        '%%DRIVERNAME%%',
  config:             alias('model.%%DRIVERNAME%%Config'),
  app:                service(),
  cookies:            service(),
  settings:           service(),
  step:               1,
  authToken:          null,
  netModelChoices:    NET_MODEL_CHOICES,
  storageTypeChoices: STORAGE_TYPE_CHOICES,
  bridges:            null,
  imageFiles:         null,
  storage:            null,
  storageType:        null,
  domains:            null,
  nodes:              null,

  init() {
    // This does on the fly template compiling, if you mess with this :cry:
    const decodedLayout = window.atob(LAYOUT);
    const template      = Ember.HTMLBars.compile(decodedLayout, {
      moduleName: 'nodes/components/driver-%%DRIVERNAME%%/template'
    });
    set(this,'layout', template);
    this._super(...arguments);
  },
  /*!!!!!!!!!!!DO NOT CHANGE END!!!!!!!!!!!*/

  // Write your component here, starting with setting 'model' to a machine with your config populated
  bootstrap: function() {
    // bootstrap is called by rancher ui on 'init', you're better off doing your setup here rather then the init function to ensure everything is setup correctly
    console.log('resourceFields: ', get(this, 'resourceFields'));
    console.log('schema        : ', get(this, 'schema'));

    let config = get(this, 'globalStore').createRecord({
      type:                   '%%DRIVERNAME%%Config',
      user:                   this.fieldDef('user').default,
      realm:                  this.fieldDef('realm').default,
      password:               '',
      host:                   '',
      node:                   '',
      port:                   this.fieldDef('port').default,
      cpuSockets:             this.fieldDef('cpuSockets').default,
      cpuCores:               this.fieldDef('cpuCores').default,
      memoryGb:               this.fieldDef('memoryGb').default,
      netModel:               this.fieldDef('netModel').default,
      netBridge:              '',
      netVlantag:             '',
      pool:                   '',
      guestUsername:          '',
      guestPassword:          '',
      guestSshPrivateKey:     '',
      guestSshPublicKey:      '',
      guestSshAuthorizedKeys: '',
      imageFile:              '',
      disksizeGb:             this.fieldDef('disksizeGb').default,
      storage:                this.fieldDef('storage').default,
      storageType:            this.fieldDef('storageType').default,
      driverDebug:            true,
      restyDebug:             true,

    });

    set(this, 'model.%%DRIVERNAME%%Config', config);
    console.log('schema        : ', get(this, 'schema'));
  },

  resourceFields: computed('driverName', 'schema', function() {
    if (get(this, 'schema')) {
      return get(this, 'schema').get('resourceFields');
    }
  }),

  fieldNames: computed('driverName', 'schema', function() {
    if (get(this, 'schema')) {
      return Object.keys(get(this, 'schema').get('resourceFields'));
    }
  }),

  schema: computed('driverName', function() {
    const configName = `${ get(this, 'driverName') }Config`;
    return get(this, 'globalStore').getById('schema', configName.toLowerCase());
  }),

  fieldDef: function(fieldName) {
    let fields = get(this, 'resourceFields');
    return fields[fieldName];
  },

  // Add custom validation beyond what can be done from the config API schema
  validate() {
    // Get generic API validation errors
    this._super();
    var errors = get(this, 'errors')||[];
    if ( !get(this, 'model.name') ) {
      errors.push('Name is required');
    }

    // Add more specific errors

    // Check something and add an error entry if it fails:
    /*
    if ( parseInt(get(this, 'config.memorySize'), defaultRadix) < defaultBase ) {
      errors.push('Memory Size must be at least 1024 MB');
    }
    */

    // Set the array of errors for display,
    // and return true if saving should continue.
    if ( get(errors, 'length') ) {
      set(this, 'errors', errors);
      return false;
    } else {
      set(this, 'errors', null);
      return true;
    }
  },

  actions: {
    proxmoxLogin() {
      console.log('Proxmox VE Login.');
      set(this, 'step', 2);
      return this.getToken().then(() => {
        return this.getImageFiles().then((imageFiles) => {
          return this.getNetBridges().then((bridges) =>  {
            return this.getDiskStorageLocation().then((storage) => {
              setProperties(this, {
                imageFiles,
                bridges,
                storage, 
                step: 3,
              });
            });
          });
        });
      }).catch((err) => {
        setProperties(this, {
          errors: [err.message],
          step: 1
        });
      });
    },
    preFetchBaseData() {
      return this.getDomains().then((domains) => {
        setProperties(this, {
          domains,
          'errors': null,
        });
      }).catch((err) => {
        set(this, 'errors', [err.message]);
      });
    },
  },

  getDomains() {
    return this.apiRequest('GET', '/access/domains', false, false).then((json) => {
      return json.data.map(domain => {
        return { 
          name: `${domain.realm} - ${domain.comment}`, 
          value: domain.realm,
          default: domain.default
        }
      });
    });
  },

  getToken() {
    return this.apiRequest('POST', '/access/ticket', true).then((json) => {
      set(this, 'authToken', json.data);
    });
  },

  getImageFiles() {
    return this.apiRequest('GET', `/nodes/${this.config.node}/storage`).then((json) => {
      let out      = [];
      let promises = [];
      console.log('storages: ', json.data);
      let storage  = json.data.filter(store => store.type === 'dir' && store.content.includes('iso'));
      storage.forEach( (store) =>  {
        promises.push(this.getImageFilesFromStorage(store.storage));
      });

      return Ember.RSVP.all(promises).then((imageArrays) => {
        imageArrays.forEach((ary) => {
          out.pushObjects(ary||[]);
        });

        return out;
      });
    });
  },

  getDiskStorageLocation() {
    return this.apiRequest('GET', `/nodes/${this.config.node}/storage/`).then((json) => {
      let storage = json.data.filter(store => store.content.includes('images') && store.content.includes('rootdir'));
      return storage;
    });
  },

  getImageFilesFromStorage(storage) {
    return this.apiRequest('GET', `/nodes/${this.config.node}/storage/${storage}/content`).then((json) => {
      let images = json.data.filter(image => image.format === 'iso' && image.content === 'iso');
      return images;
    });
  },

  getNetBridges: function() {
    return this.apiRequest('GET', `/nodes/${this.config.node}/network`).then((json) => {
      let netBridges = json.data.filter(device => device.type === 'bridge');
      return netBridges;
    });
  },

  apiRequest: function(method, path, login=false, sendHeaders=true) {
    let version    = `${ get(this, 'settings.rancherVersion') }`;
    let apiUrl     = `${this.config.host}:${this.config.port}/api2/json${path}`;
    let url        = `${ get(this, 'app.proxyEndpoint') }/`;
    url           += apiUrl.replace(/^http[s]?:\/\//, '');
    let headers    = new Headers();
    let options    = {
      method: method,
    };

    console.log(`Rancher version: ${version} api call with authToken: ${this.authToken} for command: ${path}`);
    if(sendHeaders) {
      if(login) {
        options['body'] = `username=${ escape(this.config.user) }@${ escape(this.config.realm) }&password=${ escape(this.config.password) }`;
        headers.append('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
        get(this, 'cookies').remove("PVEAuthCookie");
      } else {
        get(this, 'cookies').setWithOptions("PVEAuthCookie", this.authToken.ticket, {
          secure: 'auto'
        });
  
        headers.append("X-API-Cookie-Header", `PVEAuthCookie=${this.authToken.ticket};`);
        headers.append("CSRFPreventionToken", this.authToken.CSRFPreventionToken);
        headers.append("username", this.authToken.username);
      }
    }    

    options['headers'] = headers;
    console.log('fetch options: ', options);
    return fetch(url, options).then((response) => {
      if(response.status === 200) {
        return response.json();
      } else {
        return Ember.RSVP.reject(new Error(`Error (${response.status}): ${response.statusText}`));
      }
    });
  },
});