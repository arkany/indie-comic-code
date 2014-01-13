# Indie Comic Code

Hey there True Believers,

tl;dr - This is is/was/will be ExtendScripts and Actions to expedite the comic creation process. 

Making an independent comic book is a ton of work. Writing it, drawing it, inking it, lettering it, getting it print ready, making it ready for Comixology, converting it to PDF - it's like you're an adult with a lot of work to do. 

I don't have that kind of time. I make my comic in my mornings, nights and weekends, so I wanted to find ways to speed it up anywhere I can. 

Thusly, here are some scripts to help speed that process up. Some may be .atn, some .jsx, and all through *sheer tomhackery*.

I am/was/will be making these to help myself and, hopefully, any independent comic creators to speed up their workflow.


# Photoshop Scripts
** Script 01** - *Place Illustrator Lettering file into Photoshop as a Smart Object*

Reasoning: It's easier to draw vectors in Illustrator. Plus when I want to edit the Illustrator file, I can just double click it and it opens in Illustrator.

# Illustrator Scripts
** Script 01** - *Pull dialogue for PageX*

Description: Prompts you for the page number, you get all the dialogue as individual text boxes and removes name and description, etc. Defaults to 'Comic Geek' font.

## File Structure
All the scripts I've made thus far are dependent on the file sturure. I sort my directory as such:

_assets
 - Issue X Script.pdf
 - Issue X Script.txt
 - ...

00-Scan
 - 000-front-cover.tif
 - 01.tif
 - ...

01-PSD
 - 000-front-cover.psd
 - 000-front-inside.psd
 - 01.psd
 - ...

02-Lettering
 -  01.ai
 - ...

03-TIF-output
 - ...

04-Comixology-output
 - 000-font-cover.jpg
 - ...

05-PDF
 - Comixology-version.pdf
 - Print-version.pdf
...

## AI Action Todos 
 - Update Script 01: Create new page, place image from psd, add text from matching page.

## PS Action Todos
- Format for LithoNinja
- Format for Absolute Color / Comixpress
- Format for 

## Script Todos
- Pull dialogue for Page X
- Convert TIFs to PDF
- Convert Comixology to PDF
- Comixology Submit Template Collection

## General Todo
- Move Todos to Github Issues
- Add Actions
- Link to other Actions online
- Convert Scripts into Plugins
- Starter Bubbles for Illustrator
- ???
- Profit
