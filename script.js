$(document).ready(function () {

    $('.color-choose input').on('click', function () {
        const modelViewer = document.querySelector('#model-demo');
        modelViewer.variantName = $(this).attr('data-image');
    });
});
