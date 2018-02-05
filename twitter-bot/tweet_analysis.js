(function() {
  //Author: Matthew Rowlandson
  // Purpose: Does our analysis on tweets
  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');
  const moment = require('moment');
  let Twitter = new Twit(twitterConfig);
  let models = require('./models');
  const Influencer = models.Influencer;

  //Class
  module.exports = function(searchTerms) {
    //Builds our custom tweet object with our specified fields
    this.buildTweetObject = function(rawTweet) {
      return {
        id: rawTweet.id_str,
        text: rawTweet.text,
        dateRaw: rawTweet.created_at,
        dateUnix: moment(rawTweet.created_at, "ddd MMM DD HH:mm:ss +ZZ YYYY", 'en').valueOf()
      }
    };

    //Checks if a tweet is related to search terms
    this.hasSearchTerms = function(tweet) {
      //For each search term, look for it
      var found = false;
      for (var i = 0; i < searchTerms.length; i++) {
        if (tweet.text.indexOf(searchTerms[i]) > -1) {
          //We found one of the search terms.
          found = true;
          break;
        }
      }
      return found;
    };


  };
}());