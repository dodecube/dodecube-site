let scene, camera, renderer;
let cubes = [];
let audioContext, analyser, dataArray;

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 12;
    camera.position.y = 0.3;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    // Create cubes and dodecahedron
    createCube(5.0, 2.0, 0xffffff);
    createCube(3.5, 2.0, 0xffffff);
    createDodecahedron(2.0, 2.0, 0xffffff);

    // Audio setup
    initAudio();
}

function createCube(size, speed, color) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.8 });
    const cube = new THREE.Mesh(geometry, material);
    cube.baseSize = size;
    cube.baseSpeed = speed;
    cube.angle = 0;
    scene.add(cube);
    cubes.push(cube);
}

function createDodecahedron(size, speed, color) {
    const geometry = new THREE.DodecahedronGeometry(size);
    const material = new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.8 });
    const dodecahedron = new THREE.Mesh(geometry, material);
    dodecahedron.baseSize = size;
    dodecahedron.baseSpeed = speed;
    dodecahedron.angle = 0;
    dodecahedron.colorPhase = 0;
    dodecahedron.colorSpeed = 0.3;
    scene.add(dodecahedron);
    cubes.push(dodecahedron);
}

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
        })
        .catch(err => {
            console.error('Error accessing microphone:', err);
        });
}

function animate() {
    requestAnimationFrame(animate);

    // Update audio data
    analyser.getByteFrequencyData(dataArray);

    const low = average(dataArray, 1, 8) / 255;
    const mid = average(dataArray, 8, 46) / 255;
    const high = average(dataArray, 46, 232) / 255;

    // Update cubes and dodecahedron
    cubes.forEach((cube, i) => {
        const amp = i === 2 ? (low + mid + high) / 3 : [low, mid, high][i];
        cube.angle += (cube.baseSpeed + 30 * amp) * 0.016;
        cube.scale.setScalar(cube.baseSize * (1.0 + 0.12 * amp));

        if (cube.geometry.type === 'DodecahedronGeometry') {
            cube.colorPhase = (cube.colorPhase + 0.016 * cube.colorSpeed) % 1.0;
            const targetColor = hsvToRgb(cube.colorPhase, 0.9, 1.0);
            cube.material.color.setRGB(targetColor[0], targetColor[1], targetColor[2]);
        } else {
            const blink = (Math.sin(cube.angle * 0.2) + 1) / 2;
            cube.material.color.setRGB(blink, blink, blink);
        }

        cube.rotation.x = cube.angle;
        cube.rotation.y = cube.angle;
    });

    renderer.render(scene, camera);
}

function average(dataArray, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
        sum += dataArray[i];
    }
    return sum / (end - start);
}

function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r, g, b];
}
