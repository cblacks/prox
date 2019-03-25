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
  authToken:       null,
  netModelChoices: NET_MODEL_CHOICES,
  step:            1,
  bridges:         null, 

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

    let resourceFields = get(this, 'resourceFields');
    console.log('resourceFields: ', resourceFields);
    console.log('resourceFields: ', resourceFields['cpuCores']);
    console.log('resourceFields: ', resourceFields['cpuCores'].default);
    console.log('resourceFields: ', resourceFields['cpuCores'].description);
    console.log('resourceFields: ', this.fieldDef('cpuCores').default);
    console.log('schema: ', get(this, 'schema'));

    let config = get(this, 'globalStore').createRecord({
      type:                   '%%DRIVERNAME%%Config',
      user:                   this.fieldDef('user').default,
      realm:                  this.fieldDef('realm').default,
      password:               '',
      host:                   this.fieldDef('host').default,
      port:                   8006,
      cpuSockets:             this.fieldDef('cpuSockets').default,
      cpuCores:               this.fieldDef('cpuCores').default,
      memoryGb:               this.fieldDef('memoryGb').default,
      netModel:               this.fieldDef('netModel').default,
      netBridge:              this.fieldDef('netBridge').default,
      netVlantag:             this.fieldDef('netVlantag').default,
      pool:                   this.fieldDef('pool').default,
      guestUername:           'rancher',
      guestPassword:          '',
      guestSshPrivateKey:     '',
      guestSshPublicKey:      '',
      guestSshAuthorizedKeys: '',
    });

    set(this, 'model.%%DRIVERNAME%%Config', config);
    console.log('schema: ', get(this, 'schema'));
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
  }/*.property('field', 'resourceType', 'schema')*/,
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
      set(this, 'errors', null);
      let bridges = [];
      Promise.all([this.authRequest('/access/ticket')]).then(function (responses) {
        console.log('responses: authRequest: ', responses);
        self.setProperties({
          authToken: responses[0].data,
          errors: [],
          step: 2,
        });
      }).then(function () {
          // call proxmox login here

          // get bridges

          setProperties(this, {
            'bridges': bridges,
            'step': 2,
          });
      }).catch(function(err) {
        err.then(function(msg) {
          self.setProperties({
            errors: ['Error received from Proxmox VE ' + msg.errors[0].reason ],
            gettingData: false,
            step: 1,
          });
        });
      });
    },
  },
  authRequest: function(path) {
    let self     = this;
    let url      = 'https://' + self.config.host + ':' + self.config.port  + '/api2/json'+ path;
    let username = self.config.user + '@' + self.config.realm;
    let password = self.config.password;
    //let params   = encodeURIComponent('username') + '=' + encodeURIComponent(username) + '&' + encodeURIComponent('password') + '=' + encodeURIComponent(password);
    let params   = 'username=' + username + '&password=' + password;

    let headers  = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
    headers.append('Accept', 'application/json');

    console.log('params: ', params);

    return fetch(url, {
      method: 'POST',
      headers: headers,
      mode: 'no-cors',
      dataType: 'json',
      body: params
    }).then(res => res.ok ? res.json : Promise.reject( res.json() ) );
  },
  apiRequest: function(path) {
    let self     = this;
    let url      = 'https://' + self.config.host + ':' +  self.config.port + '/api2/json:'  + path;
    let username = self.config.username + '@' +self.config.realm;
    let password = self.config.password;

    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({username:username,password:password})
    }).then(res => res.ok ? res.json : Promise.reject( res.json() ) );
  },
  // Any computed properties or custom logic can go here
});
