# Population growth visualization
This is a visualization of the Swedish population throughout time, built with [d3js](https://d3js.org) (mostly).

## Live demo
For a live demo, click [here](https://blog.nimishg.com/public/sweden-population/svpop.html).

(To just see the underlying data as a line graph, click [here](https://blog.nimishg.com/public/sweden-population/svpop_chart.html)).

## About
The main visualization is in svpop.html, and steps through year by year.

The graphic shows Sweden, the world, and [Yggdrasil](https://en.wikipedia.org/wiki/Yggdrasil).

There are 4 circles that travel between each graphic that each represent a population change:
* From the world to Sweden: immigrants
* From Sweden to the world: emigrants
* From Yggdrasil to Sweden: births
* From Sweden to Yggdrasil: deaths


The size of the Sweden graphic adjusts as the population of Sweden changes. The number of people represented by every pixel remains constant throughout.

The area of the circles are on the same scale as Sweden, but also factor in opacity.

So, if 1 pixel represents 1 person, and 100 people immigrated in to Sweden that given year, Sweden's area will increase by 100 pixels.

The circle moving from the world to Sweden will have an area of 100 / final_opacity, so it will be 100 if final_opacity is set to 1, and will be 1000 if final_opacity is set to .1.

## Controls
Clicking anywhere on the SVG container increments the year by 1.

Additionally, there's a list of parameters that can be adjusted underneath the SVG.


#### Sources / References
Please see the [References file](References.md) for full reference list
