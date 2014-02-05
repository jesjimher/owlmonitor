// Precios por kwh en TUR, desde 01/02/2014
var eurporkwh=0.124107*1.21;
// Con discriminación horaria
var eurporkwh_punta=0.148832*1.21;
var eurporkwh_valle=0.057995*1.21;

var mostrarmax=true;
// Valores posibles: vacío, TDH, HORAS_SOL
var mostrarZonas="TDH";

/*function zpad(str, length) {
  straux=str.toString();
  while (straux.length < length)
	 straux = "0" + straux;
  return straux;
}*/

// Pad a 2 dígitos de un número
// Mucho más rápido que zpad
function pad2(n) {
  return n<10?'0'+n:n;
}

// Devuelve una fecha en formato YYYYMMDD
function soloFecha(d) {
//  return moment(d).format("YYYYMMDD");
  return ''+d.getFullYear()+pad2(d.getMonth()+1,2)+pad2(d.getDate(),2);
}

function timeFormat(formats) {
  return function(date) {
    var i = formats.length - 1, f = formats[i];
    while (!f[1](date)) f = formats[--i];
    return f[0](date);
  };
}

// Ajusta los ticks del eje según el nivel de ampliación
function ajustar(axis,extent) {
  intervalo=extent[1]-extent[0];
  // > 3 días, sólo mostramos los días
  f={tipo:d3.time.days,interv:1};
  //axis=axis.ticks(d3.time.hours,4);
  // Entre 2 días y 5 días
  if (intervalo <5*86400000) {
	 f.tipo=d3.time.hours;f.interv=4;
  }
  // Entre 12h y 2 días
  if (intervalo <2*86400000) {
		 f.tipo=d3.time.hours;f.interv=1;
	  }
  // Entre 6h y 12h
  if (intervalo <86400000/2) {
	 f.tipo=d3.time.minutes;f.interv=30;
  }
  // Entre 3h y 6h
  if (intervalo <86400000/4) {
	 f.tipo=d3.time.minutes;f.interv=15;
  }
  // Menos de 3h
  if (intervalo <86400000/8) {
	 f.tipo=d3.time.minutes;f.interv=5;
  }
  
  axis=axis.ticks(f.tipo,f.interv);
  return axis;
}

// Cambiar tamaño de los gráficos cuando se redimensione la ventana
// COMPLEJO, DE MOMENTO NO SE EJECUTA
function updateWindow() {
  width = window.innerWidth - margin.left - margin.right - 10;
  tamgrande=0.6*window.innerHeight;
  height = tamgrande - margin.top - margin.bottom;  
  height2=0.2*window.innerHeight;
  
  // Recalcular ejes
  x.range([0,width]);
  x2.range([0,width]);
  y.range([height,0]);
  y2.range([height2,0]);
  
  xAxis.scale(x);
  xAxis2.scale(x2);
  xAxisDias.scale(x2);
  yAxis.scale(y);
  yAxis2.scale(y2);
  
  // Cambiar tamaños de los SVG
  svgsup.attr("width",width+ margin.left + margin.right);
  svgsup.attr("height",height+ margin.top + margin.bottom);
  svginf.attr("width",width+ margin.left + margin.right);
  svginf.attr("height",height2+ margin.top + margin.bottom);
  
  focus.select(".x.axis").call(xAxis);  
  focus.select(".y.axis").call(yAxis);
  context.select(".y.axis").call(yAxis2);
  context.select(".x.axis2").call(xAxisDias);
  
  // Cambiar tamaño de las barras
  anchobarra=x2(cd[1].date);
  context.selectAll(".bar")
	 .attr("height", function(d) { return height2 - y2(d.kwh); })
	 .attr("y",function(d) {return y2(d.kwh);})
	 .attr("width",anchobarra-2);  
}

// Datos en bruto
var datos;
// Consumo diario en kWh
var consdiario=[];

var tamgrande=0.6*window.innerHeight;
var margin = {top: 10, right: 10, bottom: 40, left: 40},
    margin2 = {top: 500, right: 10, bottom: 20, left: 40},
    width = window.innerWidth - margin.left - margin.right - 10,
//	 width=500,
    height = tamgrande - margin.top - margin.bottom,
    //height2 = tamgrande - margin2.top - margin2.bottom;
	 height2=0.2*window.innerHeight;
    margin2.top=550;

var parseDate = d3.time.format("%Y-%m-%d %H:%M").parse;

var x = d3.time.scale().range([0, width]),
    x2 = d3.time.scale().range([0, width]),
    y = d3.scale.linear().range([height, 0]),
    y2 = d3.scale.linear().range([height2, 0]);

var customTimeFormat = timeFormat([
  [d3.time.format("%Y"), function() { return true; }],
//  [d3.time.format("%b"), function(d) { return d.getMonth(); }],
  [d3.time.format("%b %d"), function(d) { return d.getDate() == 1; }],
//  [d3.time.format("%a %d"), function(d) { return d.getDay() && d.getDate() != 1; }],
  [d3.time.format(""), function(d) { return (d.getHours()==0); }],  // No mostrar las 0h
  [d3.time.format("%H"), function(d) { return d.getHours(); }],
  [d3.time.format("%H:%M"), function(d) { return d.getMinutes(); }],
/*  [d3.time.format(":%S"), function(d) { return d.getSeconds(); }],
  [d3.time.format(".%L"), function(d) { return d.getMilliseconds(); }]*/
]);    
	 // Eje x superior
//	var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(customTimeFormat),
  //TODO:Formato variable que muestra minutos o no en función del tamaño/zoom
  var xAxis = d3.svg.axis()
	 .scale(x)
	 .orient("bottom")
	 .tickFormat(d3.time.format("%H:%M"))
	 .ticks(d3.time.hours,1),
    // Eje x inferior
    xAxis2 = d3.svg.axis().scale(x2).orient("bottom").tickFormat(d3.time.format("%d")).ticks(d3.time.days,1),    
    // Eje y inferior
    yAxis2 = d3.svg.axis().scale(y2).orient("left"),
    // Eje y superior
    yAxis = d3.svg.axis().scale(y).orient("left"),
    // Eje de meses
    xAxisDias=d3.svg.axis().scale(x2).orient("bottom")
    	.ticks(d3.time.months,1)
    	.tickFormat(d3.time.format("%b"))
    	.tickSize(-height2-40);
//	xAxisDias.selectAll("line").attr("transform", "translate(0,-50)");
	
    
// Brush para calcular consumo de una franja
var brushdet=d3.svg.brush()
  .x(x)
  .on("brushend",brushdetend);
		
// Brush para la gráfica inferior
var brush = d3.svg.brush()
    .x(x2)
    .on("brush", brushed)
	 .on("brushend", brushend);
	 /*var brush2= d3.svg.brush()
	 .x(x2)
	 .on("brushend",brushed2);*/

// Área gráfica superior
var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.date); })
    .y0(height)
    .y1(function(d) { return y(d.w); });

//Área gráfica inferior
/*var area2 = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x2(d.date); })
    .y0(height2)
    .y1(function(d) { return y2(d.w); });*/

var svgsup = d3.select("#graficasup").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

var svginf = d3.select("#graficainf").append("svg")
	 .attr("width", width + margin.left + margin.right)
	 .attr("height", height2 + margin.top + margin.bottom);
	 
svgsup.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("width", width)
    .attr("height", height);

// Grafica superior
var focus = svgsup.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");	 
	 
// Grafica inferior
var context = svginf.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("consumo.csv", function(error, data) {

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.w = +d.w;
  });
  
  datos=data;
  
  // Ordenar por fecha por si las moscas
  datos.sort(function(a,b){return a.date-b.date;});
  
  // Crear un array para acelerar las búsquedas por fecha
  lookup={};
  for (var i = 0; i < datos.length; i++) {
	 amd=soloFecha(datos[i].date);
	 if (!(amd in lookup))
		lookup[amd] = i;
  }
  
  // Calcular kWh por día
  datos.forEach(function(d) {
	 ind=soloFecha(d.date);
	 if (ind in consdiario)
		consdiario[ind]+=d.w/60000;
	 else
		consdiario[ind]=d.w/60000;
  });
  // Convertir a un array apto para D3
  cd=[];
  var pd = d3.time.format("%Y%m%d").parse;  
  for (d in consdiario) {
	 cd.push({date:pd(d),kwh:consdiario[d]});
  }
  // Ordenar por fecha por si las moscas
  cd.sort(function(a,b){return a.date-b.date;});
  
  //alert(maxp+" "+maxd);

  
  
/*  aux=datos.map(function(d){return {x:d.date.getTime(),y:d.w}});
  simpli=simplify(aux,3).map(function(d){return {date:new Date(d.x),w:d.y}});*/
//  simpli=datos;

// Empezamos con los datos del último día
  udia=cd[cd.length-1];
  detalle=datos.slice(lookup[soloFecha(udia.date)],datos.length);
  
  // Ejes de la gráfica superior
  ext=[detalle[0].date,detalle[detalle.length-1].date];
  x.domain(ext);
  y.domain([0, 1.2*d3.max(datos.map(function(d) { return d.w; }))]);

  // Ejes de la gráfica inferior
  fechamax=new Date(d3.max(cd.map(function(d){return d.date;})).getTime());
  // Añadimos un día más para que se vea la última barra
  fechamax.setDate(fechamax.getDate()+1);
  ext=[cd[0].date,fechamax];
  x2.domain(ext);
  y2.domain([0, 1.1*d3.max(cd.map(function(d) { return d.kwh; }))]);
  
//  xAxis=ajustar(xAxis,ext);
  
  // focus es el gráfico grande superior
  
  focus.append("path")
      .datum(detalle)
      .attr("clip-path", "url(#clip)")
      .attr("d", area)
		.attr("id","grafica");

/*  anchobarra=x(cd[1].date);
  focus.selectAll(".bar")
	 .data(cd)
	 .enter()
		.append("rect")
		.attr("class","bar")
		.attr("x",function(d) {return x(d.date);})
		.attr("width",anchobarra)
		.attr("y",function(d) {return y(d.w);})
		.attr("height", function(d) { return height - y(d.w); });*/
		

  // Eje x
  focus.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  focus.append("g")
      .attr("class", "y axis")
      .call(yAxis);
	
	dibujarMax(mostrarmax);
	dibujarZonasHorarias(mostrarZonas=="TDH");		
	 
	
		
/*  focus.append("g")
		.attr("class","x brush")
		.call(brush2)
		.selectAll("rect")
		  .attr("y",-6)
		  .attr("height",height+7);*/
		
  
//  focus.selectAll("line").data(y2.ticks(10)).enter().append("line").attr("x1",0).attr("x2",100).attr("y1",y2).attr("y2",y2).style("stroke","#ccc");
  // context es el gráfico inferior

  anchobarra=x2(cd[1].date);
  aux=context.selectAll(".bar")
  .data(cd)
  .enter();
  aux.append("rect")
	 .attr("class","bar")
	 .attr("x",function(d) {return x2(d.date)+1;})
	 .attr("width",anchobarra-2)
	 .attr("y",function(d) {return y2(d.kwh);})
	 .attr("height", function(d) { return height2 - y2(d.kwh); });
  
  // Mostrar etiquetas en las barras con el importe en eur
  // De momento no lo pongo porque queda raro
/*  aux.append("text")
		.attr("x",function(d) {return x2(d.date)+1;})
		.attr("y",function(d) {return y2(d.kwh)-1;})
		.attr("class","etibarra")
		.text(function(d) {return (d.kwh*eurporkwh).toFixed(1)+"€"});*/
  

  context.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);
  // eje inferior de días
  context.append("g")
		.attr("class", "x axis2")
		.attr("transform", "translate(0," + (height2+30) + ")").call(xAxisDias);
  context.append("g")
		.attr("class","y axis")
		.call(yAxis2);
  // Rótulo del eje y
  context.append("text")
	 .attr("class","rotuloy")
/*	 .style("writing-mode","tb")
	 .style("glyph-orientation-vertical","0")*/
	 .text("kWh")
	 .attr("x",5);
	 
  var brushg=context.append("g")
      .attr("class", "x brush")
      .call(brush);
  brushg.selectAll("rect")
      .attr("y", -6)
      .attr("height", height2 + 7);

  var brushdetg=focus.append("g")
		.attr("class","x brush")
		.call(brushdet);
	brushdetg.selectAll("rect")
		.attr("y", 0)
		.attr("height", height+1);
  brushdetg.insert("text",".background")
		.text("aaaa")
		.attr("id","kwhsel")
		.attr("style","display:none");
		

  // Cambiamos los handles
/*  var arc = d3.svg.arc()
		.outerRadius(height2 / 4)
		.startAngle(0)
		.endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });
  brushg.selectAll(".resize").append("path")
		.attr("transform", "translate(0," +  (6+(height2 / 4)) + ")")
		.attr("d", arc);*/

/*		context.selectAll(".resize rect")
		  .style("visibility","visible");*/
		
  transformaciones();
  
  // Activar eventos y configuraciones iniciales
  checkmax=d3.select("#mostrarmax");
  checkmax.on("change",function() {
	 mostrarmax=d3.select("#mostrarmax").property("checked");	 
	 dibujarMax(mostrarmax);
  });
  checkmax.property("checked",mostrarmax);
  
  // Complejo, de momento nada
//  window.onresize=updateWindow;
  
  // Hover sobre el gráfico grande
  focus.on("mousemove",dibujarActual);
  
  // Radiobutton de zonas
  d3.select("input#TDH").property("checked",mostrarZonas=="TDH");
  d3.selectAll("input[name=zonas]").on("change",cambioZonas);

  
  
});

// Aplica las transformaciones manuales que no se pueden hacer con CSS, 
// y que se perderían ante cualquier actualización del gráfico
function transformaciones() {
  // Justificación izquierda de labels de xAxisMeses
  context.selectAll(".x.axis2 text")
		.attr("x",6)
		.attr("y",0)
		.style("text-anchor","start");
  // Rotación de labels axis principal
	anchobarra=x2(cd[1].date);
	context.selectAll(".x.axis text")
//		.attr("transform","rotate(90)")
		.attr("x",anchobarra/2)
		.attr("y",9)
		.style("text-anchor","center");
  
  
}

// Actualiza qué zonas se deben mostrar
function cambioZonas() {
  mostrarZonas="";
  if (this.id=="TDH") 
	 mostrarZonas="TDH";
  if (this.id=="horasluz")
	 mostrarZonas="HORAS_LUZ";
  
  dibujarZonasHorarias(mostrarZonas=="TDH");	 
  
}

// Dibuja una línea vertical marcando el consumo instantáneo en la posición del cursor
function dibujarActual() {
  // Borrar línea anterior
//  focus.selectAll(".lineacur,.textocur").remove();
  
  // Recuperar posición del ratón
  posx=d3.mouse(this)[0];
  
  // Si no había línea, la añadimos
  lin=focus.select(".lineacur");
  if (lin.empty()) {
	 lin=focus.append("line")
	 .attr("class","lineacur");
  }
  // Y finalmente modificamos la posición
  lin.attr("x1",posx).attr("y1",0)
	  .attr("x2",posx).attr("y2",height);
	  
  // Lo mismo con la etiqueta
  txt=focus.select(".textocur");
  if (txt.empty()) {
	 txt=focus.append("text").attr("class","textocur");
  }
  
  fechaencur=x.invert(posx);
  var i=0;
  while (detalle[i].date.getTime()<fechaencur)
	 i++;
  valw=detalle[i].w.toFixed(2);
  txt.attr("x",posx+2).attr("y",10).text(valw+" W"); 	   
}

// Dibuja el pico de consumo máximo de la vista actual
function dibujarMax(mostrar) {
  
  // Borrar existentes
  focus.selectAll(".lineamax,.textomax,.puntomax").remove();
  focus.selectAll(".lineamin,.textomin,.puntomin").remove();

  if (!mostrar)
	 return;

  // Buscar el valor máximo de la vista actual
  fmin=x.domain()[0];
  fmax=x.domain()[1];
  i=0;
  while ((i<datos.length) && (datos[i].date<=fmin))
	 i++;
  maxp=0;maxd=Date();
  minp=99999999999999;mind=Date();
  while ((i<datos.length) && (datos[i].date<=fmax)) {
	 if (datos[i].w>maxp) {
		maxp=datos[i].w;
		maxd=datos[i].date;
	 }
	 if (datos[i].w<minp) {
		minp=datos[i].w;
		mind=datos[i].date;
	 }
	 i++;
  }

  
  // Línea, etiqueta y puntote con el máximo consumo
  focus.append("line")
  .attr("class","lineamax")
  .attr("x1",0).attr("y1",y(maxp))
  .attr("x2",x.range()[1]).attr("y2",y(maxp));
  focus.append("text")
  .attr("class","textomax")
  .attr("x",x(maxd)-1).attr("y",y(maxp)-7)
  .text("Max: "+Math.round(maxp)+" W");
  focus.append("circle")
  .attr("class","puntomax")
  .attr("cx",x(maxd)).attr("cy",y(maxp)).attr("r",3);
  
  // Lo mismo con el mínimo
/*  focus.append("line")
  .attr("class","lineamin")
  .attr("x1",0).attr("y1",y(minp))
  .attr("x2",x.range()[1]).attr("y2",y(minp));
  focus.append("text")
  .attr("class","textomin")
  .attr("x",x(mind)-1).attr("y",y(minp)-7)
  .text("Min: "+Math.round(minp)+" W");
  focus.append("circle")
  .attr("class","puntomin")
  .attr("cx",x(mind)).attr("cy",y(minp)).attr("r",3);*/
}

// Dibuja las franjas de colores de discriminación horaria
// 
function dibujarZonasHorarias(mostrar) {
  // Funcioncilla para calcular si es zona valle o punta
/*  zonavalle=function(d) {
	 // Calcular estación
	 // Invierno: a partir del último domingo de octubre
	 // Verano: a partir del último domingo de marzo
	 udomingooct=
	 // En verano, valle es de 23h a 0h, y de 0 a 13h  
	 if 
	// En invierno, valle es de 22h a 0h, y de 0 a 12h  
		
  }*/

  // Borrar rectángulos existentes
  focus.selectAll(".zonadiurna").remove();
  focus.selectAll(".zonanocturna").remove();
  
  if (!mostrar)
	 return;
  
  // 1er rectángulo: desde 0 hasta la primera hora de corte
  // Determinar en qué zona estamos
  zonaverde=false;
  if (x.domain()[0].getHours()<=10)
	 zonaverde=true;
  
  rectx=1;
  fini=x.domain()[0]
  ffin=x.domain()[0];
  ffin.setHours(zonaverde?10:22);  
  ffin.setMinutes(0);  
  rectw=x(ffin)-x(fini);
  while ((rectx+rectw)<=x.range()[1]) {
	 focus.append("rect")
	 .attr("x",rectx)
	 .attr("y",0)
	 .attr("width",rectw)
	 .attr("height",y.range()[0]-1)
	 .attr("class","zona"+(zonaverde?"nocturna":"diurna"));
	 
	 zonaverde=!zonaverde;
	 rectx=rectx+rectw;
	 fini=new Date(ffin);
	 ffin.setHours(ffin.getHours()+(zonaverde?12:10));
	 rectw=x(ffin)-x(fini);
  }
  // Dibujar el último rectángulo
  rectw=x.range()[1]-rectx;
  focus.append("rect")
  .attr("x",rectx)
  .attr("y",0)
  .attr("width",rectw)
  .attr("height",y.range()[0]-1)
  .attr("class","zona"+(zonaverde?"nocturna":"diurna"));
  
}

// Calcula el consumo en kWh para el intervalo de fechas dado
function calcularkwh(e) {
  // Redondear el intervalo a minutos
  ini=e[0];
  ini.setSeconds(0,0);
  fin=e[1];
  fin.setSeconds(0,0);
  i=0;
  while (detalle[i].date.getTime()!=ini.getTime())
	 i++;
  kwh=0;
  while (detalle[i].date.getTime()!=fin.getTime()) {
	 kwh+=detalle[i].w/60000;
	 i++;
  }
  return kwh;
}

// Muestra el consumo para la franja seleccionada
function brushdetend() {
  ext=brushdet.extent();
  kwh=calcularkwh(ext);
  eti=focus.select("#kwhsel");
  if (kwh>0) {
//	 alert('Consumo en la franja: '+kwh+" kWh");
	 
	 eur=kwh*eurporkwh;
	 eti=focus.select("#kwhsel");
	 eti.style("display","inline");
	 eti.text(kwh.toFixed(2)+" kWh ("+eur.toFixed(2)+" eur)");
	 xaux=parseInt(focus.select("rect.extent").attr("x"))+1;
	 yaux=parseInt(focus.select("rect.extent").attr("y")-12);
	 eti.attr("x",xaux);
	 eti.attr("y",yaux+10);	 
  }
  else
	 eti.style("display","none");
	 
}

// Cuando se acaba la selección. Aquí es donde se hacen las cosas
function brushend() {
//  alert('cest fini');
  ext=brush.extent();
//  alert('seleccionado de '+ext[0].toLocaleDateString()+' a '+ext[1].toLocaleDateString());
  ini=lookup[soloFecha(ext[0])];
  fin=lookup[soloFecha(ext[1])];
  detalle=datos.slice(ini,fin);

  // Recalculamos los ejes para el nuevo intervalo de fechas
  ext=[detalle[0].date,detalle[detalle.length-1].date];
  x.domain(ext);
  // Por defecto el eje Y no se ajusta, queda más visual
  //TODO: Añadir un checkbox para seleccionar esto
//  y.domain([0, 1.2*d3.max(detalle.map(function(d) { return d.w; }))]);
  focus.select(".x.axis").call(xAxis);  
  focus.select(".y.axis").call(yAxis);
  
  // Eliminar el área y volverla a añadir con los nuevos datos
  // Seguro que hay una forma mejor de hacerlo, pero así va bien
  focus.select("#grafica").remove();
  focus.append("path")
  .datum(detalle)
  .attr("clip-path", "url(#clip)")
  .attr("d", area)
  .attr("id","grafica");

  // Redibujamos el máximo
  dibujarMax(mostrarmax);
  
  // Redibujamos las zonas horarias
  dibujarZonasHorarias(mostrarZonas=="TDH");
  
  // Volvemos a aplicar las transformaciones manuales que no se pueden hacer por CSS
  transformaciones();
}

// Cuando se ajusta la selección. Se redondea siempre al día
//TODO: Cada vez que se ajuste a piñón, disparar el evento para redibujar (si por rendimiento va bien)
function brushed() {
  var extent0 = brush.extent(),
  extent1;
  
  // if dragging, preserve the width of the extent
  if (d3.event.mode === "move") {
	 var d0 = d3.time.day.round(extent0[0]),
	 d1 = d3.time.day.offset(d0, Math.round((extent0[1] - extent0[0]) / 864e5));
	 extent1 = [d0, d1];
  }  
  // otherwise, if resizing, round both dates
  else {
	 extent1 = extent0.map(d3.time.day.round);
	 
	 // if empty when rounded, use floor & ceil instead
	 if (extent1[0] >= extent1[1]) {
		extent1[0] = d3.time.day.floor(extent0[0]);
		extent1[1] = d3.time.day.ceil(extent0[1]);
	 }
  }
  
  d3.select(this).call(brush.extent(extent1));  
//  alert('aa');
/*  if (brush.empty()) {
	 x.domain(x2.domain());
	 xAxis=ajustar(xAxis,x2.domain());
  } else {
	 x.domain(brush.extent());
	 xAxis=ajustar(xAxis,brush.extent());
  }
  focus.select("path").attr("d", area);
  focus.select(".x.axis").call(xAxis);
  focus.select(".x.axis2").call(xAxisDias);*/
  
  // Redibujamos el máximo
//  dibujarMax();
  
  // Redibujamos las zonas horarias
//  dibujarZonasHorarias();
  
  // Volvemos a aplicar las transformaciones manuales que no se pueden hacer por CSS
//  transformaciones();
}

// Brush adicional para la gráfica superior. Llama al otro, y sincroniza
/*function brushed2() {
  // Sincronizar los extents
  brush.extent(brush2.extent());
  d3.select(this).call(brush.event);
}*/
