
"Call Bob" is a React application that integrates with an OpenAI API and leverages the Web Speech API for voice recognition and speech synthesis.  
It provides an interactive and immersive calling conversational experience through voice.  
Users can initiate a conversation, speak commands, or ask questions in multiple languages.

## 🌟 Features

- **Voice Recognition**: Utilizes Web Speech API to recognize spoken commands.
- **Text-to-Speech**: Read the chatbot responses aloud.

- **Multi-language Support**: Uses the `next-i18next` package for i18n and allows conversation in multiple languages.

- **Interactive UI**: Easy-to-use interface with buttons to initiate and end calls.

- **Mobile Support**: Offers a mobile-friendly responsive interface.

- **Conversation History**: Stores previous conversations locally.



## 🧩 Components Overview

### `CallManager`

- Manages the call state, voice recognition, and conversation flow.

### `MessageBox`

- Displays the current chat messages with styling.

### `TalkButton`

- Provides buttons to start, end, and manage the speech-to-text operation.

### `CallHistory`

- Manages and displays the call history in a modal dialog. It fetches the call history from the local storage and allows users to review past conversations by date.

### `ConversionIdea`

- Displays conversation starter ideas in a horizontal layout. These are predefined scenarios or topics that help users initiate meaningful conversations with the chatbot.

### `ConversationIdeasModal`

- A mobile-only Drawer UI for quick conversation starters.


Then, run the development server:

```bash
$ cd call-bob/
$ npm install
$ npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
