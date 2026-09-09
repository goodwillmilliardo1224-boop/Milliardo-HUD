// play on load for gallery view
setTimeout(transition, 1000);

$('.js-trigger-transition').on('click', function(e) {
  e.preventDefault();
  transition();
});

function transition() {
  var tl = new TimelineMax();
  
  tl.to(CSSRulePlugin.getRule('body:before'), 0.2, {cssRule: {top: '50%' }, ease: Power2.easeOut}, 'close')
  .to(CSSRulePlugin.getRule('body:after'), 0.2, {cssRule: {bottom: '50%' }, ease: Power2.easeOut}, 'close')
  .to($('.loader'), 0.2, {opacity: 1})
  .to(CSSRulePlugin.getRule('body:before'), 0.2, {cssRule: {top: '0%' }, ease: Power2.easeOut}, '+=1.5', 'open')
  .to(CSSRulePlugin.getRule('body:after'), 0.2, {cssRule: {bottom: '0%' }, ease: Power2.easeOut}, '-=0.2', 'open')
  .to($('.loader'), 0.2, {opacity: 0}, '-=0.2');
}





@keyframes delay {
  0%, 40%, 100% { 
    transform: scaleY(0.05);
    -webkit-transform: scaleY(0.05);
  }  20% { 
    transform: scaleY(1.0);
    -webkit-transform: scaleY(1.0);
  }
}
body{
    font-size: 1.6rem;
  font-family: "Open Sans", sans-serif;
  color: #4089a6;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  
  &:before,
  &:after{
    content: '';
    height: 50vh;
    width:100%;
    position:fixed;
    left:0;
    background: #1c2020;
    z-index:1;
    
  }
  
  &:before{
    top: 0;
    transform: translateY(-100%);
  }
  &:after{
    bottom: 0;
    transform: translateY(100%);
  }
  
  /*&.is-changing{
    &:before,
    &:after{
      transform: translateY(0);
    }
  }*/
  
}
h1{
  color: #1c2020;
  margin-bottom: 1em;
  font-size: 2.2rem;
  font-weight: 100;
}
.btn{
  display: inline-block;
  padding: 1.4em 1.6em;
  margin-bottom: 2em;
  border-radius: 50em;
  background-color: lighten(#1c2020, 10%);
  color: #ffffff;
  font-weight: bold;
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  
  &:hover{
    background-color: lighten(#1c2020, 15%);
  }
}
.loader {
  margin: 0 auto;
  width: 60px;
  height: 50px;
  text-align: center;
  font-size: 10px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%);
  z-index: 500;
  opacity: 0;
  
  > div {
    height: 100%;
    width: 8px;
    display: inline-block;
    float: left;
    margin-left: 2px;
    animation: delay 0.8s infinite ease-in-out;
  }
  
  .bar1{
    background-color: #754fa0 ;
  }
  .bar2{
    background-color: #09b7bf;
    animation-delay: -0.7s;
  }
  .bar3{
    background-color: #90d36b;
    animation-delay: -0.6s;
  }
  .bar4{
    background-color: #f2d40d;
    animation-delay: -0.5s;
  }
  .bar5{
    background-color: #fcb12b;
    animation-delay: -0.4s;
  }
  .bar6{
    background-color: #ed1b72;
    animation-delay: -0.3s;
  }
}
main {
  height: 100vh;
  /* padding: 10px; */
  text-align: center;
  
  .-content{
    position: relative;
    height: 100vh;
    
    > div {
      height: 100%;
      overflow: hidden;
      overflow-y: auto;
    }
    
    &.-index{
        background-color: #f6f6f6;
        display: table;
        width: 100%;
      
      > div {
        display: table-cell;
        vertical-align: middle;
      }
    }
  }
}



<div class="loader">
  <div class="bar1"></div>
  <div class="bar2"></div>
  <div class="bar3"></div>
  <div class="bar4"></div>
  <div class="bar5"></div>
  <div class="bar6"></div>
</div>

<main>
  <div class="-content -index">
    <div>
      <h1>Loader Transition</h1>
      <a href="#" class="btn js-trigger-transition">Begin Transition</a>
    </div>
  </div>
</main>