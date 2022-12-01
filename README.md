# Rancher 2.x Proxmox VE UI Driver

Rancher 2 UI driver for [Proxmox VE](https://www.proxmox.com/en/proxmox-ve).

## Using the Proxmox VE UI Driver

See the Rancher Documentation on [how to add a node driver](https://rancher.com/docs/rancher/v2.6/en/admin-settings/drivers/node-drivers/) to your installation. The relevant part is in 'Adding Custom Node Drivers':

1. From the navigation expandable from the top left, choose Global Apps > Cluster Management. Then navigate to Clusters > Drivers. From the Drivers page, select the Node Drivers tab.
1. Click Add Node Driver or just activate the driver if the "Proxmox" driver is already present.
1. Complete the Add Node Driver form. Then click Create:

   | Key               | Value |
   | ----------------- | ----- |
   | Download URL      | `https://github.com/cuza/docker-machine-driver-proxmox-ve/releases/download/v0.0.2-alpha/docker-machine-driver-proxmoxve.linux-amd64` |
   | Custom UI URL     | `https://cuza.github.io/rancher-ui-driver-proxmoxve/component.js` |
   | Checksum | `8771ed1afa47a3dbc310897baacf81f7` |
   | Whitelist Domains | - `cuza.github.io`<br /> - `your-proxmox-host` |

   Hint: When updating the driver, you might need to clone your node templates to ensure they use the updated driver version.

1. Wait for the driver to become "Active"
1. From the Sidebar, choose Global Apps > Cluster Management. Then click Create. The driver and custom UI should show up.

![Configuration screen](docs/configuration-screen.png)

## Development

This package contains a small web-server that will serve up the custom driver UI at `http://localhost:3000/component.js`. You can run this while developing and point the Rancher settings there.
* `npm start`
* The driver name can be optionally overridden: `npm start -- --name=DRIVERNAME`
* The compiled files are viewable at http://localhost:3000.
* **Note:** The development server does not currently automatically restart when files are changed.

## Building

For other users to see your driver, you need to build it and host the output on a server accessible from their browsers.

* `npm run build`
* Copy the contents of the `dist` directory onto a webserver.
  * If your Rancher is configured to use HA or SSL, the server must also be available via HTTPS.

## Credits
This driver is based on the great work of:
* [lnxbil](https://github.com/lnxbil) and his [docker-machine-driver-proxmox-ve](https://github.com/lnxbil/docker-machine-driver-proxmox-ve)
* [mhermosi](https://github.com/mhermosi) and his [ui-driver-proxmoxve](https://github.com/mhermosi/ui-driver-proxmoxve)

