import datetime as DT # date library for parsing dates
import time
import re
import tweepy
import json
import operator # for sorting dictionaries
from tweepy import OAuthHandler
from textblob import TextBlob

#for plotting the results
import numpy as np
import matplotlib.mlab as mlab
import matplotlib.pyplot as plt

class TwitterClient(object):
    '''
    Generic Twitter Class for sentiment analysis.
    '''
    def __init__(self):
        '''
        Class constructor or initialization method.
        '''
        # keys and tokens from the Twitter Dev Console {REPLACE NAKUL's with a new accounts info}
        consumer_key = '9DTwWsyG7fW8kOwjAeVAcewTn'
        consumer_secret = 'wYe6CC9IFSYWpD3Aw7VOPUQTKcBRBXLlzkynQZIPNO0N2WObXq'
        access_token = '140572718-iEofi8MBOS8akd4iqf1LpBX1xbo4SPHXxqgKhOC3'
        access_token_secret = 'xDTkuECXVK7iMj5slevgqrV1Pqj2vXTpqormkFeqvvjAK'

        # attempt authentication
        try:
            # create OAuthHandler object
            self.auth = OAuthHandler(consumer_key, consumer_secret)
            # set access token and secret
            self.auth.set_access_token(access_token, access_token_secret)
            # create tweepy API object to fetch tweets
            self.api = tweepy.API(self.auth)
        except:
            print("Error: Authentication Failed")

    def three_days_before(self, date = DT.date.today()):
        # Return the date for 3 days before DT in the format YYYY-MM-DD
        return (date - DT.timedelta(days=3)).strftime('%Y-%m-%d')

    def clean_tweet(self, tweetText):
        text = tweetText

        #Remove all line breaks
        text = text.replace('\n', '').replace('\r', '').rstrip('\r\n')

        # Remove all non-ascii characters
        text = ''.join((c for c in tweetText if 0 < ord(c) < 127))

        # Normalize case
        text = text.lower()

        # Remove URLS. (I stole this regex from the internet.)
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

        # Fix classic tweet lingo
        text = re.sub(r'\bthats\b', 'that is', text)
        text = re.sub(r'\bive\b', 'i have', text)
        text = re.sub(r'\bim\b', 'i am', text)
        text = re.sub(r'\bya\b', 'yeah', text)
        text = re.sub(r'\bcant\b', 'can not', text)
        text = re.sub(r'\bwont\b', 'will not', text)
        text = re.sub(r'\bid\b', 'i would', text)
        text = re.sub(r'wtf', 'what the fuck', text)
        text = re.sub(r'\bwth\b', 'what the hell', text)
        text = re.sub(r'\br\b', 'are', text)
        text = re.sub(r'\bu\b', 'you', text)
        text = re.sub(r'\bk\b', 'OK', text)
        text = re.sub(r'\bsux\b', 'sucks', text)
        text = re.sub(r'\bno+\b', 'no', text)
        text = re.sub(r'\bcoo+\b', 'cool', text)

        #Don't need to worry about emoticons apparently (text blob ignores them or handles them well)

        return text;

    def get_tweet_sentiment(self, tweetText):
        '''
        Utility function to classify sentiment of passed tweet
        using textblob's sentiment method
        '''
        # create TextBlob object of passed tweet text
        analysis = TextBlob(tweetText);

        # Correct spelling (WARNING: SLOW)
        #analysis = analysis.correct()

        # set sentiment
        if analysis.sentiment.polarity >= 0.1:
            return {"type": 'positive', "raw": analysis.sentiment}
        elif analysis.sentiment.polarity <= -0.1:
            return {"type": 'negative', "raw": analysis.sentiment}
        else:
            return {"type": 'neutral', "raw": analysis.sentiment}

    def get_tweets(self, query, count = 100, lang = 'en', until = None, result_type = "mixed", max_id = None):
        '''
        Main function to fetch tweets and parse them.
        '''
        # empty list to store parsed tweets
        tweets = []

        if(until is None):
            until = three_days_before();

        try:
            # call twitter api to fetch tweets
            fetched_tweets = self.api.search(q = query, count = count, lang = lang, until = until, result_type = result_type, max_id = max_id)

            # parsing tweets one by one
            for tweet in fetched_tweets:
                # Ignore retweets
                if re.match(r'^RT.*', tweet.text):
                    continue

                # empty dictionary to store required params of a tweet
                parsed_tweet = {}

                #SAVE ALL THE IMPORTANT DATA WE NEED TO STORE
                # Save the tweet's ID
                parsed_tweet['id'] = tweet.id
                #Save the created at date
                parsed_tweet['created_at'] = tweet.created_at;
                # saving text of tweet
                parsed_tweet['text'] = self.clean_tweet(tweet.text)
                # saving sentiment of tweet
                sentiment_obj = self.get_tweet_sentiment(parsed_tweet['text'])
                #Store the type of sentiment in place text ('negative', 'positive', 'neutral')
                parsed_tweet['sentimentType'] = sentiment_obj['type']
                # Store the polarity of the sentiment (1-0). > 0 = positive. < 0 = negative
                parsed_tweet['sentimentPolarity'] = sentiment_obj['raw'].polarity
                # Store Likes, Retweets
                parsed_tweet['engagement'] = { "likes": tweet.favorite_count, "retweets": tweet.retweet_count }

                # appending parsed tweet to tweets list
                if tweet.retweet_count > 0:
                    # if tweet has retweets, ensure that it is appended only once
                    if parsed_tweet not in tweets:
                        tweets.append(parsed_tweet)
                else:
                    tweets.append(parsed_tweet)

            # return parsed tweets
            return tweets

        except tweepy.TweepError as e:
            # print error (if any)
            print("Error : " + str(e))

def main():
    # creating object of TwitterClient Class
    api = TwitterClient()
    # calling function to get tweets. ----->TRY REPLACING BITCOIN FOR ANY OTHER VALUE HERE TO GET THEIR SENTIMENTS!

    '''
        SEARCH QUERY PARAMS TO USE:
        result_type [what type of result, recent, mixed, popular. default: mixed]
        count [max 100]
        until YYYY-MM-DD [7 day limit, no tweets are found for a date older then a week]
        since_id [returns ids of tweets after this id]
        max_id [returns ids of tweets before this id, including max_id]
        lang [languge of the tweets to retrieve eg. 'en']
    '''
    max_id = None
    until = api.three_days_before()
    query = "Bitcoin"
    result_type = "recent"

    tweets = [] #Full list of tweets

    #Get list of tweets for the last few days
    print('Get tweets\n');
    limit = 0;
    while limit <= 5:
        new_tweets = []
        new_tweets = api.get_tweets(query = query, count = 100, lang = 'en', until = until, result_type = result_type, max_id = max_id)
        new_tweets.sort(key=lambda r: r['created_at'], reverse=True); # Sort based on newest to oldest

        if(len(new_tweets) != 0):
            #concat the new tweets to our tweets list
            tweets = tweets + new_tweets
            print('got (%d) tweets\n' % (len(new_tweets)));
            #Get the last tweet in the set and set max_id to be that tweets id
            max_id = new_tweets[len(new_tweets)-1]['id']
            limit+=1;
        else:
            #We got no tweets back. Must mean there are no more tweets left in after 'Until'
            break; #stop looping

    # NOW GIVE US A RUNDOWN OF THE TWEETS FOR THE LAST `until` timespan
    print('\n');
    # picking positive tweets from tweets
    ptweets = [tweet for tweet in tweets if tweet['sentimentType'] == 'positive']
    # percentage of positive tweets
    print("Positive tweets percentage: {} %".format(100*len(ptweets)/len(tweets)))

    # picking negative tweets from tweets
    nttweets = [tweet for tweet in tweets if tweet['sentimentType'] == 'neutral']
    # percentage of negative tweets
    print("Neutral tweets percentage: {} %".format(100*len(nttweets)/len(tweets)))

    # picking negative tweets from tweets
    ntweets = [tweet for tweet in tweets if tweet['sentimentType'] == 'negative']
    # percentage of negative tweets
    print("Negative tweets percentage: {} %".format(100*len(ntweets)/len(tweets)))
    print('\n');

    # printing top positive tweets
    print("> Most Positive tweets (Sentiment - TEXT):")
    for tweet in sorted(ptweets, key=lambda k: k['sentimentPolarity'], reverse=True)[:10]:
        print("%.2f - %s" % (tweet['sentimentPolarity'], tweet['text']) ).encode('utf-8')

    # printing top negative tweets
    print("\n> Most Negative tweets (Sentiment - TEXT):")
    for tweet in sorted(ntweets, key=lambda k: k['sentimentPolarity'], reverse=True)[:10]:
        print("%.2f - %s" % (tweet['sentimentPolarity'], tweet['text']) ).encode('utf-8')

    # Print out most Engaged Tweets
    # Most Retweeted Tweets
    print("\n> Top 5 Retweeted Tweets:")
    count = 0;
    for tweet in sorted(tweets, key=lambda k: k['engagement']['retweets'], reverse=True)[:5]:
        if(tweet['engagement']['retweets'] != 0):
            count+=1
            print("%d - %s" % (tweet['engagement']['retweets'], tweet['text']) ).encode('utf-8')
    if(count == 0):
        print('none...');

    # Most Favourited Tweets
    print("\n> Top 5 Favourited Tweets:")
    count = 0;
    for tweet in sorted(tweets, key=lambda k: k['engagement']['likes'], reverse=True)[:5]:
        if(tweet['engagement']['likes'] != 0):
            count+=1
            print("%d - %s" % (tweet['engagement']['likes'], tweet['text']) ).encode('utf-8')
    if(count == 0):
        print('none...');


if __name__ == "__main__":
    # calling main function
    main()