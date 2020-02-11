const Dream = require('./index').default
const dream = new Dream({
    show: true,
    debug: false,
})

dream
    .goto('https://www.google.com')
    .evaluate(function(){
        return document.body.innerHTML;
    })
    .end()
    .then(function(result) {
        console.log(result)
    })
