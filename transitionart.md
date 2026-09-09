$('.circle').click(function(){
    $(this).addClass('active');
    $('.page').addClass('active');
});

$('.close').click(function(){
    $('.circle').removeClass('active');
    $('.page').removeClass('active');
});



body{
    width:100%;
    height:100%;
    overflow:hidden;
}
.circle{
    position:absolute;
    width:100px;
    height:100px;
    top:50%;
    left:50%;
    margin-left:-50px;
    margin-top:-50px;
    background:blue;
    border-radius:50%;
  opacity:0.5;
    -webkit-transition:all 3s linear;
}
.second {
      background:green;
left:5px;
  
}

.circle.active{
    width:2000px;
    height:2000px;
    top:50%;
    left:50%;
    margin-left:-1000px;
    margin-top:-1000px;
}

.page{

    opacity:0;
    z-index:99;
    position:relative;
    -webkit-transition:all 0.5s;
    -webkit-transition-delay: 1s; 
    
}

.page.active{
opacity:1;
}




<title>Circular Page Transition - CSS</title>

<div class="page">This is my page 
    <div class="close">[Close me]</div>
</div>

<div class="circle"></div>

<div class="circle second"></div>