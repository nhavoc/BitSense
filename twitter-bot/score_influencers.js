(function() {
  //Author: Matthew Rowlandson
  // Purpose: Collects information about influencers tweets
  //          In order to expore a users tweets, you have to be a follower of them. (apparently) SEE actions_influencers.js on how we follow etc

  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');
  let Twitter = new Twit(twitterConfig);
  let models = require('./models');
  const Influencer = models.Influencer;

  //Class
  module.exports = function() {

    //GET PRICE


  };
}());