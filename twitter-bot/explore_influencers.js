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
  // @searchTerms : array of search terms for look for in tweets of influencer
  module.exports = function(searchTerms) {
    //Grab all the influencers that haven't had their tweets checked
    //Go through all the tweets per influencer and look for references to search terms [THIS IS GONNA TAKE A WHILE!]
    this.checkInfluenceOfNew = function() {
      Influencer.find({ influenceChecked: false }, function(err, influencers) {
        //
      });
    };

    //Go through all the influencers that already had their influence checked
    this.checkInfluenceOfOld = function() {};
  };
}());