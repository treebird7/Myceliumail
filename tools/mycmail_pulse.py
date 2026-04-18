# mycmail_pulse.py - Emotional signature analysis for messages

# Import necessary libraries
from textblob import TextBlob

def analyze_emotion(text):
    '''
    This function takes a text string as input, analyzes it using TextBlob's sentiment analysis tool,
    and returns the polarity and subjectivity of the text.
    Polarity is a float value within the range [-1.0 to 1.0] where -1 means negative sentiment and 1 means a positive sentiment.
    Subjectivity is a float value within the range [0.0 to 1.0] where 0.0 is very objective and 1.0 is very subjective.
    '''
    try:
        # Create a TextBlob object
        blob = TextBlob(text)

        # Get the sentiment polarity and subjectivity
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity

        return polarity, subjectivity

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return None

# Test the function
if __name__ == "__main__":
    text = "I love this place. The atmosphere is great and the food is delicious."
    polarity, subjectivity = analyze_emotion(text)
    print(f"Polarity: {polarity}, Subjectivity: {subjectivity}")
