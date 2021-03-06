import UI from '../ui/UI';
import Converter from '../serialization/Converter';

import PlayerLoader from './component/PlayerLoader';
import PlayerEvent from './component/PlayerEvent';
import PlayerAudio from './component/PlayerAudio';
import PlayerAnimation from './component/PlayerAnimation';
import PlayerPhysics from './component/PlayerPhysics';

/**
 * 播放器
 * @author mrdoob / http://mrdoob.com/
 * @author tengge / https://github.com/tengge1
 */
function Player(options) {
    UI.Control.call(this, options);
    this.app = options.app;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.loader = new PlayerLoader(this.app);
    this.event = new PlayerEvent(this.app);
    this.audio = new PlayerAudio(this.app);
    this.animation = new PlayerAnimation(this.app);
    this.physics = new PlayerPhysics(this.app);

    this.isPlaying = false;
    this.clock = new THREE.Clock(false);
};

Player.prototype = Object.create(UI.Control.prototype);
Player.prototype.constructor = Player;

Player.prototype.render = function () {
    (UI.create({
        xtype: 'div',
        parent: this.parent,
        id: 'player',
        scope: this.id,
        cls: 'Panel player',
        style: {
            display: 'none'
        }
    })).render();
};

/**
 * 启动播放器
 */
Player.prototype.start = function () {
    if (this.isPlaying) {
        return;
    }
    this.isPlaying = true;

    var container = UI.get('player', this.id);
    container.dom.style.display = '';

    var jsons = (new Converter()).toJSON({
        options: this.app.options,
        scene: this.app.editor.scene,
        camera: this.app.editor.camera,
        renderer: this.app.editor.renderer,
        scripts: this.app.editor.scripts,
        animation: this.app.editor.animation,
    });

    this.loader.create(jsons).then(obj => {
        this.initPlayer(obj);

        this.event.create(this.scene, this.camera, this.renderer, obj.scripts);
        this.audio.create(this.scene, this.camera, this.renderer, this.loader);
        this.animation.create(this.scene, this.camera, this.renderer, obj.animation);
        this.physics.create(this.scene, this.camera, this.renderer);

        this.clock.start();
        this.event.init();
        this.renderScene();
        this.event.start();

        requestAnimationFrame(this.animate.bind(this));
    });
};

/**
 * 停止播放器
 */
Player.prototype.stop = function () {
    if (!this.isPlaying) {
        return;
    }
    this.isPlaying = false;

    this.event.stop();

    this.loader.dispose();
    this.event.dispose();
    this.audio.dispose();
    this.animation.dispose();
    this.physics.dispose();

    var container = UI.get('player', this.id);
    container.dom.removeChild(this.renderer.domElement);
    container.dom.style.display = 'none';

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.clock.stop();
};

/**
 * 初始化播放器
 * @param {*} obj 
 */
Player.prototype.initPlayer = function (obj) {
    var container = UI.get('player', this.id);
    var editor = this.app.editor;

    this.camera = obj.camera || new THREE.PerspectiveCamera(
        editor.DEFAULT_CAMERA.fov,
        container.dom.clientWidth / container.dom.clientHeight,
        editor.DEFAULT_CAMERA.near,
        editor.DEFAULT_CAMERA.far
    );
    this.camera.updateProjectionMatrix();

    this.renderer = obj.renderer || new THREE.WebGLRenderer({
        antialias: true
    });;
    this.renderer.setSize(container.dom.clientWidth, container.dom.clientHeight);
    container.dom.appendChild(this.renderer.domElement);

    var listener = obj.audioListener || new THREE.AudioListener();
    this.camera.add(listener);

    this.scene = obj.scene || new THREE.Scene();
};

Player.prototype.renderScene = function () {
    this.renderer.render(this.scene, this.camera);
};

Player.prototype.animate = function () {
    if (!this.isPlaying) {
        return;
    }

    this.renderScene();

    var deltaTime = this.clock.getDelta();

    this.event.update(this.clock, deltaTime);
    this.animation.update(this.clock, deltaTime);
    this.physics.update(this.clock, deltaTime);

    requestAnimationFrame(this.animate.bind(this));
};

export default Player;