function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

$(document).ready(function () {
    const modelViewer = document.querySelector('#model-demo');
    const buttonTwo = document.querySelector('#button_two');
    const buttonOne = document.querySelector('#button_one');
    modelViewer.addEventListener('play', () => {
        setTimeout(function () {
            modelViewer.pause();
        }, modelViewer.duration * 1000);
    });
    buttonTwo.addEventListener('click', () => {
            if (modelViewer.availableAnimations.includes("SPLIT")) {
                modelViewer.animation = (modelViewer.availableAnimations.find((item) => {
                    return item === "SPLIT"
                }));
                modelViewer.play();
            }
        }
    );
    buttonOne.addEventListener('click', () => {
        modelViewer.pause();
        modelViewer.currentTime = 0;
        }
    );
    let model = getParameterByName("model");
    if (!model) {
        model = "chair-variant";
    }
    //const modelPath = `../assets/glb/${model}.glb`;
    const modelPath = `https://ar-with-webxr.s3.us-east-2.amazonaws.com/assets/3d/${model}.glb`
    modelViewer.src = modelPath;

    modelViewer.addEventListener('load', () => {
        const center = modelViewer.getCameraTarget();
        const size = modelViewer.getDimensions();
        const x2 = size.x / 2;
        const y2 = size.y / 2;
        const z2 = size.z / 2;
        modelViewer.updateHotspot({
            name: 'hotspot-dim+X-Y',
            position: `${center.x + x2} ${center.y + y2} ${center.z}`
        });
        modelViewer.querySelector('button[slot="hotspot-dim+X-Y"]').textContent =
            `An AR button`;
        // if (modelViewer.availableAnimations) {
        //     modelViewer.animation = (modelViewer.availableAnimations[0]);
        //     modelViewer.play();
        // }
    });
    $('.color-choose input').on('click', function () {
        modelViewer.variantName = $(this).attr('data-image');
    });
});
