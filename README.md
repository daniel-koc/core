# Hadouken Core [![Build Status](https://build.openf.in:443/buildStatus/icon?job=runtime-core&style=plastic)]() [![Join the HadoukenIO Community on Slack](http://hadoukenio.herokuapp.com/badge.svg)](http://hadoukenio.herokuapp.com/)

#### Requirements
_The following setup is known to be working well. You can try other versions at your 
own risk of losing a lot of time._
* [Visual Studio 2015 Build Tools](http://landinghub.visualstudio.com/visual-cpp-build-tools) *
* [OpenFin runtime executables](https://developer.openfin.co/versions/?product=Runtime&version=stabe) 
* [Node](https://nodejs.org/download/release/v8.2.1/) 8.2.1
* Grunt (`grunt-cli` 1.2.0)
* [Python 2.7.12](https://www.python.org/downloads/release/python-2712/)

\_______________

\* Only needed on Windows

### Building the project

#### Mac/Linux
```bash
npm install
```

#### Windows
You need to ensure that Visual Studio 2013 is used to build the project.
```bash
npm update -msvs_version=2015
npm install
```

### Testing

* Install the OpenFin cli tool
```bash
npm install -g openfin-cli
```

* Create a manifest file [Manifest file docs](https://openfin.co/application-config/), targeting a valid version [Runtime versions](https://developer.openfin.co/versions/?product=Runtime&version=stable)

app.json
```javascript
{
    "startup_app": {
        "name": "OpenfinPOC",
        "description": "OpenFin POC",
        "url": "http://www.openfin.co",
        "uuid": "OpenfinPOC-hla8ix6e0y2iwwjlxkojkbj4i",
        "autoShow": true
    },
    "runtime": {
        "arguments": "",
        "version": "[replace this with a version]"
    }
}
```

* Launch OpenFin runtime once
```bash
openfin --config app.json --launch 
```

* Replace the OpenFin core with a built Hadouken core
```bash
npm run deploy -- --target=C:\Users\[username]\AppData\Local\OpenFin\runtime\[replace this with a version]\OpenFin\resources
```

* Now you can re-launch the OpenFin runtime with the modified Hadouken core.
```bash
openfin --config app.json --launch 
```

### API Documentation

API Docs for the OpenFin core are available here:

[Alpha](http://cdn.openfin.co/jsdocs/alpha/)

[Stable](http://cdn.openfin.co/jsdocs/stable/)

### File Structure Notes
The contents of `/src/renderer/extended` folder is referenced by the `openfin.asar` (not contained in this project)

### License
The code in this repository is covered by the included license.

However, if you run this code, it may call on the OpenFin RVM or OpenFin Runtime, which are covered by OpenFin's Developer, Community, and Enterprise licenses. You can learn more about OpenFin licensing at the links listed below or just email us at support@openfin.co with questions.

https://openfin.co/developer-agreement/
https://openfin.co/licensing/
