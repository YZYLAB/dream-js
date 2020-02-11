const Dream = require('./index').default
const dream = new Dream({
    show: true,
    openDevTools: { detach: true }
})

dream
    .useragent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36')
    .goto('https://bot.sannysoft.com/')
    .evaluate(function(){
        return document.body.innerHTML;
    })
    .wait(100000000000)
    .end()
    .then(function(result) {
        console.log(result)
    })
