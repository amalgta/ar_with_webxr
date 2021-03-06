import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/build/three.module.js';
import { GLTFLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/loaders/RGBELoader.js';

class App {
    url = 'https://ar-with-webxr.s3.us-east-2.amazonaws.com/'
    selectedObject = null;
    zoomFactor = 0.01;
    touchEvent = {
        cache: {},
        prevDiff: -1,
    }

    constructor() {
        const container = document.getElementById('canvas-container')

        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

        this.assetsPath = this.url + 'assets/3d/';

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        this.camera.position.set(0, 1.6, 0);

        this.scene = new THREE.Scene();

        const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        ambient.position.set(0.5, 1, 0.25);
        this.scene.add(ambient);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.addTouchListeners(this.renderer.domElement);
        container.appendChild(this.renderer.domElement);
        this.setEnvironment();

        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );

        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);

        this.setupXR();

        window.addEventListener('resize', this.resize.bind(this));

    }

    addTouchListeners(element) {
        const self = this;
        element.addEventListener('touchstart', function (e) {
            e.preventDefault();
            self.touchDown = true;
            for (let i = 0; i < e.touches.length; i++) {
                const ev = e.touches[i];
                const event = {
                    touchX: ev.pageX,
                    touchY: ev.pageY,
                    source: ev,
                }
                self.touchEvent.cache[ev.identifier] = event;
            }
        }, false);

        element.addEventListener('touchend', function (e) {
            e.preventDefault();
            self.touchDown = false;
            self.touchEvent.prevDiff = -1;
        }, false);

        element.addEventListener('touchmove', function (e) {
            e.preventDefault();
            if (!self.touchDown) {
                return;
            }

            for (let i = 0; i < e.touches.length; i++) {
                const ev = e.touches[i];
                const cachedEv = self.touchEvent.cache[ev.identifier];

                if (cachedEv) {
                    cachedEv.deltaX = ev.pageX - cachedEv.touchX;
                    cachedEv.deltaY = ev.pageY - cachedEv.touchY;
                    cachedEv.touchX = ev.pageX;
                    cachedEv.touchY = ev.pageY;
                    cachedEv.source = ev;
                }
            }

            if (e.touches.length == 2) {
                const cache = self.touchEvent.cache;
                const currDiff = Math.abs(cache[0].source.clientX - cache[1].source.clientX);
                const prevDiff = self.touchEvent.prevDiff;
                if (prevDiff > 0) {
                    if (currDiff > prevDiff) {
                        // Increase object scale
                        self.scaleObject(self.zoomFactor);
                    }
                    if (currDiff < prevDiff) {
                        // Decrease object scale
                        self.scaleObject(self.zoomFactor*-1);
                    }
                }

                self.touchEvent.prevDiff = currDiff;
            } else if (e.touches.length == 1) {
                self.rotateObject();
            }

        }, false);
    }

    scaleObject(factor) {
        if (this.selectedObject && this.selectedObject.visible) {
            const scale = this.selectedObject.scale;
            scale.set(scale.x+factor, scale.y+factor, scale.z+factor)
        }
    }

    setupXR() {
        this.renderer.xr.enabled = true;

        if ('xr' in navigator) {

            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {

                if (supported) {
                    const collection = document.getElementsByClassName("ar-button");
                    [...collection].forEach(el => {
                        el.style.display = 'block';
                    });
                }
            });

        }

        const self = this;

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;

        function placeObject() {
            if (self.chair === undefined) return;

            if (self.reticle.visible) {
                self.chair.position.setFromMatrixPosition(self.reticle.matrix);
                self.chair.visible = true;
            }
        }

        document.getElementById('place-button').addEventListener('click', placeObject);

        this.controller = this.renderer.xr.getController(0);

        this.scene.add(this.controller);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setEnvironment() {
        const loader = new RGBELoader().setDataType(THREE.UnsignedByteType);
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        const self = this;

        loader.load(this.url + 'assets/hdr/venice_sunset_1k.hdr', (texture) => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            pmremGenerator.dispose();

            self.scene.environment = envMap;

        }, undefined, (err) => {
            console.error('An error occurred setting the environment');
        });
    }

    rotateObject() {
        const deltaX = this.touchEvent.cache[0].deltaX;
        if (this.selectedObject && this.selectedObject.visible && this.reticle.visible) {
            this.selectedObject.rotation.y += deltaX / 100;
        }
    }

    immerse(asset) {
        this.initAR();

        const loader = new GLTFLoader().setPath(this.assetsPath);
        const self = this;

        this.loadingBar.visible = true;

        // Load a glTF resource
        loader.load(
            // resource URL
            `${asset}.glb`,
            // called when the resource is loaded
            function (gltf) {

                self.scene.add(gltf.scene);
                self.chair = gltf.scene;
                self.selectedObject = gltf.scene;
                
                self.chair.visible = false;

                self.loadingBar.visible = false;

                self.renderer.setAnimationLoop(self.render.bind(self));
            },
            // called while loading is progressing
            function (xhr) {

                self.loadingBar.progress = (xhr.loaded / xhr.total);

            },
            // called when loading has errors
            function (error) {

                console.log('An error occurred', error);

            }
        );
    }

    initAR() {
        let currentSession = null;
        const self = this;

        const sessionInit = {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.getElementById('content') }
        };

        function onSessionStarted(session) {

            session.addEventListener('end', onSessionEnded);

            self.renderer.xr.setReferenceSpaceType('local');
            self.renderer.xr.setSession(session);

            currentSession = session;

        }

        function onSessionEnded() {

            currentSession.removeEventListener('end', onSessionEnded);

            currentSession = null;

            if (self.chair !== null) {
                self.scene.remove(self.chair);
                self.chair = null;
            }

            self.renderer.setAnimationLoop(null);

        }

        if (currentSession === null) {

            navigator.xr.requestSession('immersive-ar', sessionInit).then(onSessionStarted);

        } else {

            currentSession.end();

        }
    }

    requestHitTestSource() {
        const self = this;

        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace('viewer').then(function (referenceSpace) {

            session.requestHitTestSource({ space: referenceSpace }).then(function (source) {

                self.hitTestSource = source;

            });

        });

        session.addEventListener('end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        });

        this.hitTestSourceRequested = true;

    }

    getHitTestResults(frame) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);

        if (hitTestResults.length) {

            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            this.reticle.visible = true;
            this.reticle.matrix.fromArray(pose.transform.matrix);

            document.getElementById("place-button").style.display = "block";
        } else {

            this.reticle.visible = false;

        }

    }

    render(timestamp, frame) {

        if (frame) {
            if (this.hitTestSourceRequested === false) this.requestHitTestSource()

            if (this.hitTestSource) this.getHitTestResults(frame);
        }

        this.renderer.render(this.scene, this.camera);

    }
}

class LoadingBar {
    constructor(options) {
        this.domElement = document.createElement("div");
        this.domElement.style.position = 'fixed';
        this.domElement.style.top = '0';
        this.domElement.style.left = '0';
        this.domElement.style.width = '100%';
        this.domElement.style.height = '100%';
        this.domElement.style.background = '#000';
        this.domElement.style.opacity = '0.7';
        this.domElement.style.display = 'flex';
        this.domElement.style.alignItems = 'center';
        this.domElement.style.justifyContent = 'center';
        this.domElement.style.zIndex = '1111';
        const barBase = document.createElement("div");
        barBase.style.background = '#aaa';
        barBase.style.width = '50%';
        barBase.style.minWidth = '250px';
        barBase.style.borderRadius = '10px';
        barBase.style.height = '15px';
        this.domElement.appendChild(barBase);
        const bar = document.createElement("div");
        bar.style.background = '#22a';
        bar.style.width = '50%';
        bar.style.borderRadius = '10px';
        bar.style.height = '100%';
        bar.style.width = '0';
        barBase.appendChild(bar);
        this.progressBar = bar;

        document.body.appendChild(this.domElement);

        function onprogress(delta) {
            const progress = delta * 100;
            loader.progressBar.style.width = `${progress}%`;
        }
    }

    set progress(delta) {
        const percent = delta * 100;
        this.progressBar.style.width = `${percent}%`;
    }

    set visible(value) {
        if (value) {
            this.domElement.style.display = 'flex';
        } else {
            this.domElement.style.display = 'none';
        }
    }
}

export { App };
