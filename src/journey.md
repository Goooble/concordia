# Journal

## Trie

built a basic trie that searches as well as return steps for visualization

## Trie visualization

Visualzed the trie using react flow, i have on idea whats happening in react flwo but i do understand the trie.ts

## inverted index

### ingestion

build a tokenizer and ingestor to get files from obsidian help docs and then find all the words

### engine

takes the tokenizer and creates an inverted index out of it that is used for the search function to find the relevent documents

### styling

spend a while styling the UI for it, madea sliding pane as well in the main ui for both the tree and the search

results show up in a cute way as well

## Trie visualizer

added the entre document to trie to visualize, i doubt i can import entirety of obsidian tho, let me try again it defo gonna crash my browser lmfao

made some optimzations to render the graph for the test document better

## trie

should i make into a radix tree or should i just work through my roadmap and build a DAT instead and the fuzzy search yeah probably that instead oh and also boolean search

## boolean search

Implemented it, it was pretty easy since it was just on teh engine side and not really on the trie
But visualizing it needed some scripts - which actually is a good ALGORITHM so yay should probably present that lol since its used by LUCENE and ELASTIC search might give us some brownie points

## Visualizer toggling

After a bunch of crashes, managed to get the visualizer to toggle and then render docs when its turned off
lesson learnt: if(visualizer) return {edges: [], nodes: []} rather than just returning null that can crash everything else lol

## prefix searching

realized it would only work for OR
TODO
I am thinking of adding a separate "suggestiosn" drop down from teh searchbox but that can wait as i can still demonstrate with
next, visualize prefix search and check if searchstep is really necessary
