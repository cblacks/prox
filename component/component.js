/*!!!!!!!!!!!Do not change anything between here (the DRIVERNAME placeholder will be automatically replaced at buildtime)!!!!!!!!!!!*/
import NodeDriver from 'shared/mixins/node-driver';

// do not remove LAYOUT, it is replaced at build time with a base64 representation of the template of the hbs template
// we do this to avoid converting template to a js file that returns a string and the cors issues that would come along with that
const LAYOUT;
/*!!!!!!!!!!!DO NOT CHANGE END!!!!!!!!!!!*/

const NET_MODEL_CHOICES = [
  {
    'name':  'Intel e1000',
    'value': 'e1000'
  },
  {
    'name':  'virtio (Paravirtualized)',
    'value': 'virtio'
  },  
  {
    'name':  'Realtek RTL8139',
    'value': 'rtl8139'
  },
  {
    'name':  'VMware vmxnet3',
    'value': 'vmxnet3'
  },
];

/*!!!!!!!!!!!GLOBAL CONST START!!!!!!!!!!!*/
// EMBER API Access - if you need access to any of the Ember API's add them here in the same manner rather then import them via modules, since the dependencies exist in rancher we dont want to expor the modules in the amd def
const computed     = Ember.computed;
const get          = Ember.get;
const set          = Ember.set;
const alias        = Ember.computed.alias;
const service      = Ember.inject.service;

const setProperties = Ember.setProperties;

const defaultRadix = 10;
const defaultBase  = 1024;
/*!!!!!!!!!!!GLOBAL CONST END!!!!!!!!!!!*/



/*!!!!!!!!!!!DO NOT CHANGE START!!!!!!!!!!!*/
export default Ember.Component.extend(NodeDriver, {
  driverName:     '%%DRIVERNAME%%',
  config:          alias('model.%%DRIVERNAME%%Config'),
  app:             service(),
  cookies:         service(),
  settings:        service(),
  step:            1,
  authToken:       null,
  netModelChoices: NET_MODEL_CHOICES,
  bridges:         [], 
  imagefiles:      [],

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
      user:                   '',
      realm:                  '',
      password:               '',
      host:                   '',
      node:                   '',
      port:                   '',
      cpuSockets:             this.fieldDef('cpuSockets').default,
      cpuCores:               this.fieldDef('cpuCores').default,
      memoryGb:               this.fieldDef('memoryGb').default,
      netModel:               this.fieldDef('netModel').default,
      netBridge:              '',
      netVlantag:             '',
      pool:                   '',
      guestUername:           '',
      guestPassword:          '',
      guestSshPrivateKey:     '',
      guestSshPublicKey:      '',
      guestSshAuthorizedKeys: '',
      imageFile:              '',
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
      let self = this;
      var errors = get(self, 'errors') || [];
      set(self, 'imagefiles', []);
      console.log('Proxmox VE Login.');
      let authToken = get(self, 'authToken');
      if(authToken === null) {
        self.apiRequest('POST', '/access/ticket').then((response) => {
          if(response.status !== 200) {
            console.log('response status !== 200 [authentication]: ', response.status );
            return;
          }
          response.json().then((json) => {
            console.log('response.json [authentication]: ', json);
            setProperties(self, {
              authToken: json.data,
              step: 2
            });
            self.setImageFiles();
            self.setNetBridges();
          });
        }).catch((err) => {
          console.log('Authentication error: ', err);
          errors.push(err);
          set(self, 'errors', errors);
        });
      }
      console.log('end of proxmoxLogin');
    },
  },
  getImageFilesFromStorage: function(storage, imageList) {
    let self = this;
    var errors = get(self, 'errors') || [];
    self.apiRequest('GET', `/nodes/${self.config.node}/storage/${storage}/content`).then((response) => {
      if(response.status !== 200) {
        console.log('response status !== 200 [storage-contents]: ', response.status );
        return;
      }
      response.json().then((json) => {
        let images = json.data.filter(image => image.format === 'iso' && image.content === 'iso');
        imageList.push(...images);
      });
    }).catch((err) => {
      console.log(`Error getting storage "${storage}" Content: ${err}`);
      errors.push(err);
      set(self, 'errors', errors);
    });
    console.log('end of getImageFilesFromStorage');
  },
  setImageFiles: function() {
    let self = this;
    var errors = get(self, 'errors') || [];
    self.apiRequest('GET', `/nodes/${self.config.node}/storage`).then((response) => {
      if(response.status !== 200) {
        console.log('response status !== 200 [storage]: ', response.status );
        return;
      }
      response.json().then((json) => {
        let storage   = json.data.filter(store => store.type === 'dir' && store.content.includes('iso'));
        let imageList = [];
        storage.forEach( (store) =>  {
          self.getImageFilesFromStorage(store.storage, imageList);
        });
        console.log('imageList: ', imageList);
        set(self, 'imagefiles', imageList);
      });
    }).catch((err) => {
      console.log('Error getting Networks: ', err);
      errors.push(err);
      set(self, 'errors', errors);
    });
    console.log('end of setImageFiles');
  },
  setNetBridges: function() {
    let self   = this;
    var errors = get(self, 'errors') || [];
    self.apiRequest('GET', `/nodes/${self.config.node}/network`).then((response) => {
      if(response.status !== 200) {
        console.log('response status !== 200 [networks]: ', response.status );
        return;
      }
      response.json().then((json) => {
        let netBridges = json.data.filter(device => device.type === 'bridge');
        console.log('netBridges:  ', netBridges);
        set(self, 'bridges', netBridges);
      });
    }).catch((err) => {
      console.log('Error getting Networks: ', err);
      errors.push(err);
      set(self, 'errors', errors);
    });
    console.log('end of setNetBridges');
  },
  verCompare: function(ver1, ver2) {
    /**
     * ver1 = ver2 diff = 0
     * ver1 > ver2 diff > 0
     * ver1 < ver2 diff < 0
     */
    return ver1.replace(/[v\.]/g, '') - ver2.replace(/[v\.]/g, '');
  },
  apiRequest: function(method, path) {
    let self       = this;
    var errors     = get(self, 'errors') || [];
    let version    = `${ get(this, 'settings.rancherVersion') }`;
    let apiUrl     = `${self.config.host}:${self.config.port}/api2/json${path}`;
    let url        = `${ get(this, 'app.proxyEndpoint') }/`;
    url           += apiUrl.replace(/^http[s]?:\/\//, '');
    let headers    = new Headers();
    let options    = {
      method: method,
    };

    console.log(`Rancher version: ${version} api call with authToken: ${self.authToken} for command: ${path}`);
    if(self.authToken === null) {
      options['body'] = `username=${self.config.user}@${self.config.realm}&password=${self.config.password}`;
      headers.append('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
      get(this, 'cookies').remove("PVEAuthCookie");
    } else {
      if ( self.verCompare('v2.1.6', version) > 0 ) {
        // Something like this should be done on next release of Rancher.
        headers.append("X-API-Cookie-Header", `PVEAuthCookie=${self.authToken.ticket};`);
      } else {
        /**
         * Use this code until next release. 
         * next release service will remove the hability to use cookies service to send
         * custom cookies and will add some headers so proxy service pass the apropriate cookie
         */
        get(this, 'cookies').setWithOptions("PVEAuthCookie", self.authToken.ticket, {
          secure: 'auto'
        });
      }
      headers.append("CSRFPreventionToken", self.authToken.CSRFPreventionToken);
      headers.append("username", self.authToken.username);
    }

    options['headers'] = headers;
    console.log('fetch options: ', options);
    return fetch(url, options).catch((err) => { 
      console.log('fetch error: ', err); 
      errors.push(err);
      set(self, 'errors', errors);
    });
  },
  // Any computed properties or custom logic can go here
});
