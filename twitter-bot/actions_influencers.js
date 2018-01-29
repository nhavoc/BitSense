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

    //NOTE: Apparently we don't need to follow users to read al their tweets.
    // We are going to folllow influencers that have quality influence only
    this.follow = function(influencer) {
      return new Promise(function(resolve, reject) {
        if (influencer.followed == true) {
          return resolve(false);
        }
        Twitter.post('friendships/create', { screen_name: influencer.accountName }, function(err, data, response) {
          if (err) {
            reject(err);
          } else {
            influencer.update({ followed: true }, function(err, doc) {
              if (err) {
                reject("Update of influencer failed")
              } else {
                resolve(influencer.accountName);
              }
            })
          }
        });
      });
    }

    //This influencer didn't make the cut. So lets ignore
    this.unfollowInfluencer = function(influencer) {
      return new Promise(function(resolve, reject) {
        console.log("TODO");
      });
    }

    //Retrieves the users tweets : SEE HERE https://developer.twitter.com/en/docs/tweets/timelines/guides/working-with-timelines
    //@influencer : the influencer model instance
    //@since : The tweets
    this.getTweets = function(influencer, since) {
      return new Promise(function(resolve, reject) {
        //use the max_id param to specify the ceiling of our cursor
        let maxId = null;
        let sinceID = influencer.sinceId;
        let params = {
          screen_name: influencer.accountName,
          count: 200, //MAX
          trim_user: 1, //We don't need the user obj
          include_rts: 1, //include retweets as content
          exclude_replies: 1, //ignore replies (we may use these down the road?)
        };
        if(sinceID){
          params.since_id = sinceID;
        }
        Twitter.get("statuses/user_timeline", params, function(err, tweets, response) {
          if(err || response.statusCode != 200){
            reject(err || "Twitter returned an odd status code during tweet retrieval")
          }else{
            console.log(tweets);
          }
        });

        //Store the since_id  param to the greatest ID of all the Tweets your application has already processed
      });
    }
  };
}());