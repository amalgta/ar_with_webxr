$(document).ready(function () {

    $('.color-choose input').on('click', function () {
        var headphonesColor = $(this).attr('data-image');

        $('.active').removeClass('active');
        $('.left-column img[data-image = ' + headphonesColor + ']').addClass('active');
        $(this).addClass('active');
    });

    const modelViewer = document.querySelector("model-viewer");
    window.switchSrc = (element, name) => {
        const base = "../../assets/ShopifyModels/" + name;
        modelViewer.src = base + '.glb';
        modelViewer.poster = base + '.png';
        const slides = document.querySelectorAll(".slide");
        slides.forEach((element) => {
            element.classList.remove("selected");
        });
        element.classList.add("selected");
    };

    document.querySelector(".slider").addEventListener('beforexrselect', (ev) => {
        // Keep slider interactions from affecting the XR scene.
        ev.preventDefault();
    });
});
