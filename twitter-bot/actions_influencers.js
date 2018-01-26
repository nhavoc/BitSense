(function() {
  // Author: Matthew Rowlandson
  // Purpose: The action methods for the twitter bot, following influencers, retweeting tweets etc'

  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');
  let Twitter = new Twit(twitterConfig);
  let models = require('./models');
  const Influencer = models.Influencer;

  // API METHODS : https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/overview
  // POST friendships/create : Allows the bot to follow a user [We follow new influencers, and continue to follow STRONG influencers]
  // POST friendships/destroy : Allows the bot to unfollow a user [we unfollow low scoring influencers]
  // GET followers/list : Allows us to get a list of people that follow the user
  // GET friends/ids : Allows us to get users that the specified user follows

  module.exports = function() {
    //get a list of people that follow the user
    this.getFollowersList = function(screenName) {
      return new Promise(function(resolve, reject) {
        //Grab a list of user ids that follow the user (NOTE: 5000 returned in one cursor) 
        Twitter.get('followers/ids', { screen_name: screenName }, function(err, data, response) {
          if (err || data.error) {
            reject(err);
          } else {
            if (data.next_cursor != 0) {
              console.log("NOTE TO SELF. Follower list is larger then 5K! Congrats cryptosense bot... now fix this code to get full list using cursors (data included in data obj)")
            }
            resolve(data.ids);
          }
        });
      });
    }

    this.followInfluencer = function(influencer) {
      return new Promise(function(resolve, reject) {});
    };

    //This influencer didn't make the cut. So lets ignore
    this.unfollowInfluencer = function(influencer) {
      return new Promise(function(resolve, reject) {});
    }
  };
}());