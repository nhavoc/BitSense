(function() {
  const Chalk = require('chalk');
  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');

  let Twitter = new Twit(twitterConfig);

  //Pull list of ranked influencers from mongo, (go through, check if we follow them or not, if not, follow them (this will be our list?))

  //Pull all most recent tweets from those main influencers

  //Grab their sentiment for each tweet

  //Compare each tweet's submission date with the bitcoin price.

  //Correlation? (if so, save that tweet)

  //All the tweets that were correlating for that day, combine into a single tweet.

  //Submit the tweet to cryptosense-bot
  //  FORMAT: BTC price today at 12pm: $12000 USD
  //          Top 5 most popular influencial tweets:
  //          - RT @philip12342 Bitcoin is going to $100K !

  //TODO, do additional analysis weekly of the price and our predictions for the price the following week.


  var params = {
    q: '#bitcoin, #Bitcoin, #BITCOIN', // REQUIRED
    result_type: 'recent',
    lang: 'en'
  }
  Twitter.get('search/tweets', params, function(err, data) {
    // if there no errors
    if (!err) {
      // grab ID of tweet to retweet
      var retweetId = data.statuses[0].id_str;

      for (var i = 0; i < data.statuses.length; i++) {
        console.log(data.statuses[i].text);
      }
    }
  });


}());