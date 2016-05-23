
  //TODO: Do this with queue.js (once it stabilizes)
  var async_resources = ["sweden", "world", "population_years"];
  var loaded_resources = {}


  // get a bounding box for an element,
  // apply transform to get a real bounding box
  function transformedBBox(element){
    var bbox = element.node().getBBox();
    var curr_transform = d3.transform(element.attr("transform"));
    bbox.width *= curr_transform.scale[0];
    bbox.height *= curr_transform.scale[1];
    bbox.x += curr_transform.translate[0];
    bbox.y += curr_transform.translate[1];
    bbox.midpoint = [bbox.x + bbox.width/2.0, bbox.y + bbox.height/2.0];
    return bbox;
  }

  // init svg

  var width = 960,
      height = 500,
      margin = {top: 20, right: 40, bottom: 30, left: 20};

  var svg = d3.select('#svg_container').append('svg')
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //yggdrasil, imported
  var yggdrasil = svg.append("use")
    .attr("xlink:href", "#yggdrasil" )
    .attr("transform", "translate(" + (2 * width / 3) + "," + margin.top * 8 + ") scale(.33)");

  //sweden = null, world = null, population_years = null;
  var sweden, world, population_years;

  d3.json('./data/sverige.topojson', function(data){
      var subunits = topojson.feature(data, data.objects.sverige);
      var counties = data.objects.sverige.geometries;

      var projection = d3.geo.mercator()
          .scale(1)
          .translate([0, 0]);

      var path = d3.geo.path()
          .projection(projection);

      var b = path.bounds(topojson.merge(data, counties)),
          s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
          t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

      projection.scale(s).translate(t);

      // single sweden, merging all the municipalities
      sweden = svg.append("path")
      .datum(topojson.merge(data, data.objects.sverige.geometries))
      .attr("class", "sv-unselected")
      .attr('d', d3.geo.path().projection(projection));

      loaded_resources.sweden = true;
      check_ready();
    });

  d3.json('./data/world-50m.json',function(data){
    var projection = d3.geo.orthographic()
        .scale(84)
        .translate([(width+margin.left) / 6 , (height+margin.top) / 2])
        .clipAngle(90);

    //just a good angle, can rotate later
    projection.rotate([42.3, -17.2]);

    var path = d3.geo.path()
        .projection(projection);

    world = svg.append("path")
        .datum(topojson.merge(data, data.objects.countries.geometries.filter(
          function(d) {  //cut out Sweden
            if(+d.id == 752){return false;} else return true;
          }
        )))
        .attr("class", "world-no-sv")
        .attr("d", path);

    /*
    bbox = transformedBBox(world);
    ocean = svg.insert("ellipse", ":first-child")
               .attr("rx",bbox.width/2.0)
               .attr("ry",bbox.height/2.0)
               .attr("cx", bbox.midpoint[0])
               .attr("cy", bbox.midpoint[1])
               .attr("class", "ocean");
    */
    loaded_resources.world = true;
    check_ready();
  });


  d3.csv("./data/svpop.csv", function(d) {
    return {
      year: +d.year, // convert "Year" column to Date
      population: +d.totals,
      births: +d.births,
      deaths: +d.deaths,
      immigrants: +d.immigrants,
      emigrants: +d.emigrants // convert "Length" column to number
    };
    }, function(error, rows) {
    population_years = rows;

    loaded_resources.population_years = true;
    check_ready();
  });

  var calculate_step;
  var year_offset, curr_year;

  var midpoints = {};
  var circleData = [];
  var circles;
  var easeparam = "cubic";
  // Time to complete one path
  timeparam = 2300;
  d3.select("#timeparam").property("value",timeparam);

  var final_opacity = .2;
 // data 'ready'
 function check_ready(){
   for (i in async_resources){
     if (!(async_resources[i] in loaded_resources)){
       return;
     }
   }
   // calculate midpoints
   midpoints = {
     'sweden': transformedBBox(sweden).midpoint,
     'yggdrasil': transformedBBox(yggdrasil).midpoint,
     'world': transformedBBox(world).midpoint
   };
   midpoints.world_sv = [(midpoints.world[0] + midpoints.sweden[0])/2,
                         (midpoints.world[1] + midpoints.sweden[1])/2];
   midpoints.ygg_sv = [(midpoints.yggdrasil[0] + midpoints.sweden[0])/2,
                       (midpoints.yggdrasil[1] + midpoints.sweden[1])/2];



  // scale for sweden
  var pop_max = d3.max(population_years, function(d) { return d.population; });
  var bbox = sweden.node().getBBox();
  var pop_ratio = (pop_max + 0.0)/ (bbox.width * bbox.height);
  var map_ratio = bbox.width/(bbox.height + 0.0);

  calculate_step = function(row){
      var pixels = row.population / pop_ratio;
      //if box
      var c_width = Math.sqrt( pixels * map_ratio);
      var c_height = pixels / c_width;
      var scaling_ratio = c_width/bbox.width;

      var retval = {
        'scaling_ratio': scaling_ratio,
        /**************************
        Note: scaling scales the coordinate system of the original, not just pixels
        and bounding box gets the bbox in the coordinate system of the parent.
        In this case, the SVG has a bbox with a translation in it inside the parent
        meaning that translation gets scaled as well.  This equation is to re-center it
        accounting for that initial translation in the NEW coordinate system.
        ***************************/
        'x_transf': width/2.0   - (scaling_ratio * (bbox.width/2.0)) - (scaling_ratio * bbox.x),
        'y_transf': height/2.0 - (scaling_ratio * (bbox.height/2.0)) - (scaling_ratio * bbox.y)
      };
      var vals = ["immigrants", "emigrants", "births", "deaths"];
      for (var i in vals){
        var idx = vals[i];
        if (row[idx] == 0){
          retval[idx] = 0;
        }
        else{
          retval[idx] = Math.sqrt((row[idx] / pop_ratio) / ( Math.PI * final_opacity));
        }
      }
      return retval;
  };

  // real inits
  year_offset = population_years[0].year;
  curr_year = year_offset;
  d3.select('#curr_year').property("value",curr_year);
  var init_yrs = calculate_step(population_years[0]);
  sweden.transition().duration(500).ease("linear").attr("transform",
    "translate("+ init_yrs.x_transf + ","+ init_yrs.y_transf +") scale(" + init_yrs.scaling_ratio + ")");

  disp_year.text(curr_year);
  disp_subtext.text(population_years[curr_year-year_offset].population.toLocaleString());
  d3.select("#svg_container").on("click", do_step);

  // circles
  // definitions

  // indvandring
  t_circle = d3.map();
  t_circle.set("id", 'immigrants');
  t_circle.set("init_radius", 1);
  t_circle.set("init_class", "immigrants");
  t_circle.set("final_radius", init_yrs['immigrants']);
  t_circle.set("rotrx", (midpoints.sweden[0] - midpoints.world[0]) / 2 );
  // random y axis rotation between 5 and 55
  t_circle.set("rotry", Math.floor( (Math.random() * 50) + 50));
  t_circle.set("offset_x", midpoints.world_sv[0]);
  t_circle.set("offset_y", midpoints.world_sv[1]);
  t_circle.set("l_to_r", true);
  t_circle.set("overhand", true);
  circleData.push(t_circle);

  // utvandring
  t_circle = d3.map();
  t_circle.set("id", 'emigrants');
  t_circle.set("init_radius", 1);
  t_circle.set("init_class", "emigrants");
  t_circle.set("final_radius", init_yrs['emigrants']);
  t_circle.set("rotrx", (midpoints.sweden[0] - midpoints.world[0]) / 2 );
  // random y axis rotation between 5 and 55
  t_circle.set("rotry", Math.floor( (Math.random() * 50) + 50));
  t_circle.set("offset_x", midpoints.world_sv[0]);
  t_circle.set("offset_y", midpoints.world_sv[1]);
  t_circle.set("l_to_r", false);
  t_circle.set("overhand", false);
  circleData.push(t_circle);

  // foda
  t_circle = d3.map();
  t_circle.set("id", 'births');
  t_circle.set("init_radius", 1);
  t_circle.set("init_class", "births");
  t_circle.set("final_radius", init_yrs['births']);
  t_circle.set("rotrx", (midpoints.yggdrasil[0] - midpoints.sweden[0]) / 2 );
  // random y axis rotation between 5 and 55
  t_circle.set("rotry", Math.floor( (Math.random() * 50) + 50));
  t_circle.set("offset_x", midpoints.ygg_sv[0]);
  t_circle.set("offset_y", midpoints.ygg_sv[1]);
  t_circle.set("l_to_r", false);
  t_circle.set("overhand", true);
  circleData.push(t_circle);

  // doda
  t_circle = d3.map();
  t_circle.set("id", 'deaths');
  t_circle.set("init_radius", 1);
  t_circle.set("init_class", "deaths");
  t_circle.set("final_radius", init_yrs['deaths']);
  t_circle.set("rotrx", (midpoints.yggdrasil[0] - midpoints.sweden[0]) / 2 );
  // random y axis rotation between 5 and 55
  t_circle.set("rotry", Math.floor( (Math.random() * 50) + 50));
  t_circle.set("offset_x", midpoints.ygg_sv[0]);
  t_circle.set("offset_y", midpoints.ygg_sv[1]);
  t_circle.set("l_to_r", true);
  t_circle.set("overhand", false);
  circleData.push(t_circle);

  // end init circles

  // add circles to DOM
  circles = svg.selectAll("circle")
  	.data(circleData, function(d) { return d.get('id');})
  	.enter()
  	.append("circle")
    .attr("opacity", 1)
  	.attr("r", function(d){ return d.get('init_radius');})
    .classed("hidden", true);

} // end data "ready"



// define tweening
function animateArc() {
	// d = data
	// t = time index (fraction) between 0 and 1.0
    return function(d, i, a) {
      return function(t) {
  		// t = time index (fraction) between 0 and 1.0
  		var t_offset_x = d.get('offset_x');
  		var t_offset_y = d.get('offset_y');
  		var l_to_r = d.get('l_to_r');
  		var overhand = d.get('overhand');

  		var rotation_radius_x = d.get('rotrx');
  		var rotation_radius_y = d.get('rotry');

      // Left to right across defined ellipse, or not
  		if(l_to_r){
  			t = 1.0 - t;
  		}
      // overhand or underhand across defined ellipse
  		if(overhand){
  			t *= -1.0;
  		}
      // set to 2 * PI to get a full round-trip
  		var t_angle =  Math.PI * ( t);
  		var t_x = rotation_radius_x * Math.cos(t_angle);
  		var t_y = rotation_radius_y * Math.sin(t_angle);
  		return "translate(" + (t_offset_x + t_x) + "," + (t_offset_y + t_y) + ")";
      };
    };
  }


  function do_step(){
    curr_year = d3.select("#curr_year").property("value");
    curr_year = +curr_year;

    timeparam = d3.select("#timeparam").property("value");
    timeparam = +timeparam;
    if (curr_year - year_offset < population_years.length){
      curr_year += 1;
    }
    else{
      curr_year = year_offset;
    }
    d3.select("#curr_year").property("value", curr_year);
    disp_year.text(curr_year);
    disp_subtext.text(population_years[curr_year-year_offset].population.toLocaleString());
    var curr_step = calculate_step(population_years[curr_year-year_offset]);

    for(i in circleData){
      if(circleData[i].get('id') in curr_step){
        circleData[i].set("final_radius", curr_step[circleData[i].get('id')]);
        // random y axis rotation between 5 and 55
        circleData[i].set("rotry", Math.floor( (Math.random() * 50) + 50));
      }
    }


    circles
     .transition()
     .duration(timeparam)
     .ease(easeparam)
     .attrTween("transform", animateArc())
     .attr("r", function(d){ return d.get('final_radius')})
     .attr("opacity", final_opacity)
     .each("start", function(d){
        d3.select(this)
        .attr("class", function(d){ return d.get('init_class');})
        .classed("hidden", false);
      })
     .each("end", function(d){
        //reset
        d3.select(this)
        .transition()
        .duration(500)
        .attr("opacity", 0.0)
        .attr("r", 1)
        .each("end", function(d){
          d3.select(this)
           .attr("opacity", 1)
           .attr("r", function(d){ return d.get('init_radius');})
           .attr("class", function(d){ return d.get('init_class')})
           .classed("hidden", true);
        });

        sweden.transition().duration(500).ease("linear").attr("transform",
          "translate("+ curr_step.x_transf + ","+ curr_step.y_transf +") scale(" + curr_step.scaling_ratio + ")");


     });
  }
  d3.select("#bStart").on("click", do_step);


  // Extra display text
  var disp_year = svg.append("text")
      .attr("class", "title")
      .attr("dy", ".5em")
      .text("Sweden");

  var disp_subtext = svg.append("text")
      .attr("class", "subtitle")
      .attr("dx", "10")
      .attr("dy", "4em")
      .text("population");
