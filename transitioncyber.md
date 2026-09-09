*, :before, :after 
  box-sizing border-box
  padding 0
  margin 0
  
// styles
.hide 
  display none

.page__style 
  background #6D326D
  font-family OpenSans-Regular, sans-serif
  position fixed
  top 0
  right 0
  bottom 0
  left 0
  height 100%
  width 100%
  margin auto auto
  overflow hidden
  
  .page__description
    color #ffffff
    font-weight 300
    text-align center
  h1
    font-weight 300
    margin-top 200px
    margin-bottom 30px

  .btn_nav
    background #002A32
    border-radius 30px
    border none
    color #fff
    cursor pointer
    font-family inherit
    font-size 15px
    font-weight bold
    text-transform uppercase
    letter-spacing 1px
    margin-bottom 20px
    padding 17px 30px
    width 146px
    &:focus,
    &:active
      outline none
      
  a
    text-decoration none
    color #fff
    &:hover
      text-decoration underline



// Animation class
.animate_content
  animation animate 3s ease

@keyframes animate
  10%
    transform scale(1, 0.002)
  35%
    transform scale(0.2, 0.002)
    opacity 1
  50%
    transform scale(0.2, 0.002)
    opacity 0
  85%
    transform scale(1, 0.002)
    opacity 1
  100%
    transform scale(1, 1)


.fadeIn
  z-index 10
    
/*  home
-----------------------------------*/
.home
  background #5DA9E9

/*  Projects
-----------------------------------*/
.projects
  background #BD5DE9

/*  Skills
-----------------------------------*/
.skills
  background #5DE974

/*  About
-----------------------------------*/
.about
  background #FB9B33

/*  Contact
-----------------------------------*/
.contact
  background #C9CDC0
      
/*****************************************************************
~ Mobile media-queries (max-width: 767px)
******************************************************************/

@media only screen and (max-width: 767px)
  .page__description
    h1
      margin-top 100px









      $('.btn_nav').click(function() {
  // animate content
  $('.page__style').addClass('animate_content');
  $('.page__description').fadeOut(100).delay(2800).fadeIn();

  setTimeout(function() {
    $('.page__style').removeClass('animate_content');
  }, 3200);

  //remove fadeIn class after 1500ms
  setTimeout(function() {
    $('.page__style').removeClass('fadeIn');
  }, 1500);

});

// on click show page after 1500ms
$('.home_link').click(function() {
  setTimeout(function() {
    $('.home').addClass('fadeIn');
  }, 1500);
});

$('.projects_link').click(function() {
  setTimeout(function() {
    $('.projects').addClass('fadeIn');
  }, 1500);
});

$('.skills_link').click(function() {
  setTimeout(function() {
    $('.skills').addClass('fadeIn');
  }, 1500);
});

$('.about_link').click(function() {
  setTimeout(function() {
    $('.about').addClass('fadeIn');
  }, 1500);
});

$('.contact_link').click(function() {
  setTimeout(function() {
    $('.contact').addClass('fadeIn');
  }, 1500);
});









<div class="page__style projects">
  <div class="page__description">
    <div id="projects">

      <h1>Projects</h1>

      <button class="btn_nav projects_link">Projects</button>
      <button class="btn_nav skills_link">Skills</button>
      <button class="btn_nav home_link">Home</button>
      <button class="btn_nav about_link">About</button>
      <button class="btn_nav contact_link">Contact</button>

      <p>Thanks <a href="https://codyhouse.co/gem/animated-page-transition/" target="_blank">codyhouse.co</a></p>

    </div>
  </div>
</div>
<!--
    //  skills
    ///////////////////////////////////-->
<div class="page__style skills">
  <div class="page__description">
    <div id="skills">
      <h1>Skills</h1>

      <button class="btn_nav projects_link">Projects</button>
      <button class="btn_nav skills_link">Skills</button>
      <button class="btn_nav home_link">Home</button>
      <button class="btn_nav about_link">About</button>
      <button class="btn_nav contact_link">Contact</button>

      <p>Thanks <a href="https://codyhouse.co/gem/animated-page-transition/" target="_blank">codyhouse.co</a></p>

    </div>
  </div>
</div>

<!--
    //  about
    ///////////////////////////////////-->
<div class="page__style about">
  <div class="page__description">
    <div id="about">
      <h1>About</h1>

      <button class="btn_nav projects_link">Projects</button>
      <button class="btn_nav skills_link">Skills</button>
      <button class="btn_nav home_link">Home</button>
      <button class="btn_nav about_link">About</button>
      <button class="btn_nav contact_link">Contact</button>

      <p>Thanks <a href="https://codyhouse.co/gem/animated-page-transition/" target="_blank">codyhouse.co</a></p>

    </div>
  </div>
</div>
<!--
    //  contact
    ///////////////////////////////////-->
<div class="page__style contact">
  <div class="page__description">
    <div id="contact">
      <h1>Contact</h1>

      <button class="btn_nav projects_link">Projects</button>
      <button class="btn_nav skills_link">Skills</button>
      <button class="btn_nav home_link">Home</button>
      <button class="btn_nav about_link">About</button>
      <button class="btn_nav contact_link">Contact</button>

      <p>Thanks <a href="https://codyhouse.co/gem/animated-page-transition/" target="_blank">codyhouse.co</a></p>

    </div>
  </div>
</div>
<!--
    //  home
    ///////////////////////////////////-->
<div class="page__style home">
  <div class="page__description">
    <div id="home">

      <div class="box"></div>

      <h1>Home</h1>

      <button class="btn_nav projects_link">Projects</button>
      <button class="btn_nav skills_link">Skills</button>
      <button class="btn_nav home_link">Home</button>
      <button class="btn_nav about_link">About</button>
      <button class="btn_nav contact_link">Contact</button>

      <p>Thanks <a href="https://codyhouse.co/gem/animated-page-transition/" target="_blank">codyhouse.co</a></p>
    </div>
  </div>
</div>








