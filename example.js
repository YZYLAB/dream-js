const Dream = require('./index').default;
const dream = new Dream({show: true, debug: false});

dream
    .goto('https://www.google.com')
    .wait('body')
    .end()
    .then(function(result) {
        console.log(result)
    })
    .catch(function(error) {
        console.error('Search failed:', error)
    })

