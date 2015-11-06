(function() {
    var mscale = 1,
        t = [0, 0],
        proj = d3.geo.mercator().scale(mscale).translate(t),
        path = d3.geo.path().projection(proj).pointRadius(1),
        margin = 25,
        s = window.innerHeight < 800 ? 25 : 30,
        numBins = 10,
        sSites = new Array(),
        preEleSSites = [],
        width = window.innerWidth - numBins * s - 185,
        height = window.innerHeight - margin - 80,
        selectMode = -1,
        svg = d3.select("#map")
        .append("svg:svg")
        .attr("height", height)
        .attr("width", width)
        .call(d3.behavior.zoom().on("zoom", redrawMap)),
        map = svg.append("svg:g"),
        shapes = map.append("svg:g"),
        sites = map.append("svg:g"),
        graph = d3.select("#graph")
        .append("svg:svg")
        .attr("height", numBins * s + 170)
        .attr("width", numBins * s + 175)
        .append("svg:g")
        .attr("transform", "translate(165,160)"),
        elegraph = d3.select("#elehist")
        .append("svg:svg")
        .attr("height", 150)
        .append("svg:g")
        .attr("transform", "translate(10,5)"),
        elebins = d3.layout.histogram(),
        eledata = null,
        escale = d3.scale.linear()
        .domain([0, 500, 1000, 1500, 2000, 3000])
        .range(["rgb(160, 190, 160)",
            "rgb(130, 220, 130)",
            "rgb(240, 250, 150)",
            "rgb(190, 185, 135)",
            "rgb(160, 155, 105)",
            "rgb(240, 240, 240)"
        ]),
        glab = d3.select("#label");

    function zoomControl(e, by) {
        var c = e.append("svg:g");
        if (by < 0) {
            c.attr("transform", "scale(-1)");
        }
        c.append("svg:path")
            .attr("stroke", "#444")
            .attr("stroke-width", 2)
            .attr("fill", "#c8bef0")
            .attr("fill-opacity", 0.8)
            .attr("d", "M-12,0V-12A12,12 0 1,1 12,-12V0Z");
        c.append("svg:path")
            .attr("stroke", "#444")
            .attr("stroke-width", 3)
            .attr("class", "control")
            .attr("d", "M-6,-12H6" + (by > 0 ? "M0,-18V-6" : ""))
            .on("click", function() {
                var evt = document.createEvent("MouseEvents");
                evt.initMouseEvent(
                    'dblclick', // in DOMString typeArg,
                    true, // in boolean canBubbleArg,
                    true, // in boolean cancelableArg,
                    window, // in views::AbstractView viewArg,
                    120, // in long detailArg,
                    width / 2, // in long screenXArg,
                    height / 2, // in long screenYArg,
                    width / 2, // in long clientXArg,
                    height / 2, // in long clientYArg,
                    0, // in boolean ctrlKeyArg,
                    0, // in boolean altKeyArg,
                    (by > 0 ? 0 : 1), // in boolean shiftKeyArg,
                    0, // in boolean metaKeyArg,
                    0, // in unsigned short buttonArg,
                    null // in EventTarget relatedTargetArg
                );
                this.dispatchEvent(evt);
            });
        return e;
    }

    var zc = svg.append("svg:g").attr("transform", "translate(15,30)");
    zoomControl(zc, 1);
    zoomControl(zc, -1);

    function elef(d) {
        return d.p.e;
    }

    function redrawMap() {
        if (d3.event.scale >= 1) {
            var tx = t[0] * d3.event.scale + d3.event.translate[0],
                ty = t[1] * d3.event.scale + d3.event.translate[1];
            proj.translate([tx, ty]);
            proj.scale(mscale * d3.event.scale);
            shapes.selectAll("path").attr("d", path);
            sites.selectAll("circle")
                .attr("r", function(d) {
                    return Math.max(1, d3.event.scale / 2) *
                        Math.max(1, 4 - d.p.r);
                })
                .attr("cx", function(d) {
                    return proj(d.geometry.coordinates)[0];
                })
                .attr("cy", function(d) {
                    return proj(d.geometry.coordinates)[1];
                });
        }
    }

    function resetSiteSelection() {
        graph.selectAll(".selected").classed("selected", false);
        sSites = [];
        updateSites();
    }

    function updateSites() {
        var sel = sites.selectAll("circle").data(sSites,
            function(e) {
                return e.geometry.coordinates;
            });
        sel.classed("site-selected", true);
        sel.exit().classed("site-selected", false);
    }

    function updateSelected(ele, i, d) {
        elegraph.selectAll(".selected").classed("selected", false);
        sSites = preEleSSites;
        if (selectMode != i) {
            resetSiteSelection();
            selectMode = i;
        }
        if (d.length > 0) {
            var idx = sSites.indexOf(d[0]);
            if (idx > -1) {
                d3.select(ele).classed("selected", false);
                sSites.splice(idx, d.length);
            } else {
                d3.select(ele).classed("selected", true);
                sSites = sSites.concat(d);
            }
            preEleSSites = sSites;
            updateSites();
            updateEleGraph();
        }
    }

    function resetLabel() {
        glab.html(sSites.length > 0 ?
            sSites.length + " site" + (sSites.length != 1 ? "s" : "") +
            " selected" : "");
    }

    function updateLabel(o, descs, num, idxs) {
        var s = num + " site" + (num != 1 ? "s" : "");
        $.each(idxs, function(i, idx) {
            var minnum = o.limits[idx[0]][0] + idx[1] * o.limits[idx[0]][1],
                tmin = minnum == Math.floor(minnum) ?
                minnum : minnum.toFixed(1),
                maxnum = o.limits[idx[0]][0] + (idx[1] + 1) * o.limits[idx[0]][1],
                tmax = maxnum == Math.floor(maxnum) ?
                maxnum : maxnum.toFixed(1);
            s += "<br/>" + descs[idx[0]].name + " " + tmin + " - " + tmax +
                " " + descs[idx[0]].unit;
        });
        glab.html(s);
    }

    function mkWOverlay(ele, eleo, data, callback, bcallback, ocallback) {
        ele.selectAll("rect")
            .data(data).enter()
            .append("svg:rect")
            .call(callback)
            .call(bcallback);
        eleo.selectAll("rect.overlay")
            .data(data).enter()
            .append("svg:rect")
            .attr("class", "overlay")
            .call(callback)
            .call(ocallback);
    }

    function mkGraph(descs) {
        var o = bin([], null, null),
            hm = graph.append("svg:g"),
            hmrows = hm.selectAll("g")
            .data(o.bins)
            .enter().append("svg:g")
            .classed("heatmap", true)
            .property("row", function(d, i) {
                return i;
            })
            .attr("transform", function(d, i) {
                return "translate(0," + (s * i) + ")";
            }),
            hmrowso = hm.selectAll("g.overlay")
            .data(o.bins)
            .enter().append("svg:g")
            .attr("class", "overlay")
            .property("row", function(d, i) {
                return i;
            })
            .attr("transform", function(d, i) {
                return "translate(0," + (s * i) + ")";
            });
        mkWOverlay(hmrows, hmrowso, function(d) {
                return d;
            },
            function() {
                this.attr("transform", function(d, i) {
                        return "translate(" + (s * i) + ",0)";
                    })
                    .attr("width", s)
                    .attr("height", s);
                return this;
            },
            function() {},
            function() {
                this.on("mouseout", resetLabel)
                    .on("click", function(d) {
                        updateSelected(this, -1, d);
                    });
            });
        // marginal distributions
        var transforms = ["translate(-35,0)",
                "rotate(90)translate(-25,0)scale(1,-1)"
            ],
            texttransforms = ["", "scale(1,-1)rotate(-90)"],
            ta = ["end", "middle"],
            bs = ["-50%", "0%"];
        $.each(o.marginals, function(i, m) {
            var me = graph.append("svg:g")
                .classed("marginal-" + i, true)
                .attr("transform", function() {
                    return transforms[i];
                });
            mkWOverlay(me, me, m, function() {
                this.attr("height", s)
                    .attr("transform", "translate(0,0)");
                return this;
            }, function() {
                this.attr("class", "hist");
            }, function() {
                this.on("mouseout", resetLabel)
                    .on("click", function(d) {
                        var thissites = $.map(d, function(e) {
                            return e;
                        });
                        updateSelected(this, i, thissites);
                    });
            });
            // labels
            me.append("svg:text")
                .attr("text-anchor", function() {
                    return ta[i];
                })
                .classed("axislabel", true)
                .attr("transform", "translate(0,0)")
                .text(descs[i].name + " [" + descs[i].unit + "]");
            me.selectAll("text.tick").data(m + o.limits[i][2]).enter()
                .append("svg:text")
                .classed("tick", true)
                .attr("transform", function(d, j) {
                    return "translate(" + 18 + "," + s * j + ")" +
                        texttransforms[i];
                })
                .attr("text-anchor", "middle")
                .attr("baseline-shift", function() {
                    return bs[i];
                });
        });
    }

    function mkEleGraph(desc, data) {
        eledata = elebins(data);
        var ys = $.map(eledata, function(d) {
                return d.y;
            }),
            sscale = d3.scale.pow().exponent(.5)
            .domain([0, d3.max(ys)])
            .range([0, 100]);
        mkWOverlay(elegraph, elegraph, eledata, function() {
            this.attr("width", s)
                .attr("height", function(d) {
                    return sscale(d.y);
                })
                .attr("y", function(d) {
                    return 100 - sscale(d.y);
                })
                .attr("x", function(d, i) {
                    return i * s;
                });
            return this;
        }, function() {
            this.classed("hist", true)
                .attr("fill", function(d) {
                    return escale(d.x);
                });
        }, function() {
            this.on("click", function(d) {
                    if (d3.select(this).classed("selected")) {
                        d3.select(this).classed("selected", false);
                        var idx = sSites.indexOf(d[0]);
                        sSites.splice(idx, d.length);
                        if (sSites.length == 0) {
                            sSites = preEleSSites;
                        }
                    } else {
                        if (elegraph.selectAll(".selected").empty() && sSites.length) {
                            sSites = d.slice();
                        } else {
                            sSites = sSites.concat(d);
                        }
                        d3.select(this).classed("selected", true);
                    }
                    updateSites();
                })
                .on("mouseout", function(d) {
                    resetLabel();
                    shapes.selectAll("path.contour")
                        .classed("selected", false);
                })
                .on("mouseover", function(d) {
                    var s = d.y + " site" + (d.y != 1 ? "s" : "");
                    s += "<br/>" + desc.name + " " + d.x + " - " +
                        (d.x + d.dx) + " " + desc.unit;
                    glab.html(s);

                    shapes.selectAll("path.contour")
                        .classed("selected", function(e) {
                            return e.p.e == d.x;
                        });
                });
        });
        elegraph.append("svg:text")
            .attr("transform", "translate(" + (eledata.length * s / 2) + ",140)")
            .attr("text-anchor", "middle")
            .classed("axislabel", true)
            .text(desc.name + " [" + desc.unit + "]");
        elegraph.selectAll("text.tick").data(eledata).enter()
            .append("svg:text")
            .classed("tick", true)
            .attr("transform", function(d, j) {
                return "translate(" + j * s + ",120)" +
                    (s < 30 ? "rotate(30)" : "");
            })
            .attr("text-anchor", "middle")
            .text(function(d) {
                return d.x;
            });
    }

    function updateEleGraph() {
        var teledata = sSites.length > 0 ? elebins(sSites) : eledata;
        ys = $.map(teledata, function(d) {
                return d.y;
            }),
            sscale = d3.scale.pow().exponent(.5)
            .domain([0, d3.max(ys)])
            .range([0, 100]);
        elegraph.selectAll("rect.hist").data(teledata)
            .transition().duration(500)
            .attr("y", function(d) {
                return 100 - sscale(d.y);
            })
            .attr("height", function(d) {
                return sscale(d.y);
            });
        elegraph.selectAll("rect.overlay").data(teledata)
            .transition().duration(500)
            .attr("y", function(d) {
                return 100 - sscale(d.y);
            })
            .attr("height", function(d) {
                return sscale(d.y);
            });
    }

    function nsort(a, b) {
        return a - b;
    }

    function adjLims(min, max) {
        var tmp = Math.pow(10, ('' + Math.ceil(max)).length - 2),
            tmpmin = min - (min % tmp),
            tmpmax = max - (max % tmp) + tmp;
        return [tmpmin, tmpmax];
    }

    function mkMatrix(l) {
        m = new Array(l);
        for (var i = 0; i < l; i++) {
            m[i] = new Array(l);
            for (var j = 0; j < l; j++) {
                m[i][j] = new Array();
            }
        }
        return m;
    }

    function mkMatrixRe(l, i) {
        if (i > 0) {
            var m = new Array(l);
            for (var j = 0; j < l; j++) {
                m[j] = mkMatrixRe(l, i - 1);
            }
            return m;
        } else {
            return [];
        }
    }

    function assignBinRe(d, bins, marginals, limits, funcs, i) {
        if (i < funcs.length) {
            var nbin = Math.floor((funcs[i](d) -
                limits[i][0]) / limits[i][1]);
            marginals[i][nbin].push(d);
            assignBinRe(d, bins[nbin], marginals, limits, funcs, i + 1);
        } else {
            bins.push(d);
        }
    }

    function getMaxRe(a) {
        if (a[0] instanceof Array) {
            return d3.max($.map(a, function(b) {
                return getMaxRe(b);
            }));
        } else {
            return a.length;
        }
    }

    function updateGraph(descs, features) {
        var smonths = $("button.active").map(function(i, d) {
                return $(d).attr("id");
            }),
            rainf = function(d) {
                var sum = 0;
                smonths.each(function(i, m) {
                    sum += d.p["r" + m];
                });
                return sum;
            },
            tempf = function(d) {
                var sum = 0;
                smonths.each(function(i, m) {
                    sum += d.p["t" + m];
                });
                return (sum / smonths.length / 10).toFixed(1);
            };

        sites.selectAll("circle.site")
            .on("mouseover", function(d) {
                glab.html(d.p.n + ": " +
                    rainf(d) + " " + descs[0].unit + ", " +
                    tempf(d) + " " + descs[1].unit + ", " +
                    elef(d) + " " + descs[2].unit);
            });

        var o = bin(features, rainf, tempf);

        var colour = d3.scale.pow().exponent(.25).domain([0, o.nmax]);
        graph.selectAll("g.heatmap")
            .data(o.bins)
            .selectAll("rect")
            .data(function(d) {
                return d;
            })
            .transition().duration(500)
            .attr("stroke", function(d) {
                return d.length > 0 ? "#222" : "none";
            })
            .attr("fill", function(d, col) {
                var row = parseInt(d3.select(this.parentNode)
                        .property("row")),
                    rcolour = descs[0].scale(row * o.limits[0][1]),
                    ecolour = descs[1].scale(col * o.limits[1][1]),
                    blend = d3.rgb(d3.scale.linear()
                        .range([rcolour, ecolour])(.5));
                return colour.range(["#c8ebf0", blend])(d.length);
            });

        graph.selectAll("g.overlay")
            .data(o.bins)
            .selectAll("rect")
            .data(function(d) {
                return d;
            })
            .on("mouseover", function(d, col) {
                var n = d3.event.target.parentNode,
                    r = parseInt(d3.select(n).property("row"));
                updateLabel(o, descs, d.length, [
                    [0, r],
                    [1, col]
                ]);
            });

        $.each(o.marginals, function(i, m) {
            var sscale = d3.scale.pow().exponent(.5)
                .domain([0, o.maxs[i]])
                .range([0, 100]),
                me = graph.select("g.marginal-" + i);
            me.selectAll("rect.hist")
                .data(m)
                .transition().duration(500)
                .attr("transform", function(d, j) {
                    return "translate(" + -sscale(d.length) + "," +
                        s * j + ")";
                })
                .attr("width", function(d) {
                    return sscale(d.length);
                })
                .attr("fill", function(d, j) {
                    return descs[i].scale(j * o.limits[i][1]);
                });

            me.selectAll("rect.overlay")
                .data(m)
                .on("mouseover", function(d, j) {
                    updateLabel(o, descs, d.length, [
                        [i, j]
                    ]);
                })
                .transition().duration(500)
                .attr("transform", function(d, j) {
                    return "translate(" + -sscale(d.length) + "," +
                        s * j + ")";
                })
                .attr("width", function(d) {
                    return sscale(d.length);
                });

            var dc = sscale(d3.max([m[numBins / 2 - 1].length,
                m[numBins / 2].length, m[numBins / 2 + 1].length
            ])) + 10;
            me.selectAll("text.axislabel")
                //.transition().duration(500)
                .attr("transform", function() {
                    if (i == 0) {
                        return "translate(10,-10)";
                    } else {
                        return "translate(" + -dc + "," +
                            (s * numBins / 2 - s / 2) +
                            ")scale(1,-1)rotate(-90)";
                    }
                });
            me.selectAll("text.tick")
                .text(function(d, j) {
                    var num = o.limits[i][0] + o.limits[i][1] * j;
                    return num == Math.floor(num) ? num : num.toFixed(1);
                });
        });
    }

    function bin(raw) {
        if (arguments.length < 2) {
            return null;
        }
        var args = [],
            limits = [],
            o = new Object();
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        $.each(args, function(i, f) {
            var data = $.map(raw, function(d) {
                    return f(d);
                }).sort(nsort),
                tmp = adjLims(data[0], data[data.length - 1]),
                dmin = tmp[0],
                dmax = tmp[1],
                delta = (dmax - dmin) / numBins;
            limits.push([dmin, delta, dmax]);
        });

        var bins = mkMatrixRe(numBins, args.length),
            marginals = new Array(args.length);
        for (var i = 0; i < marginals.length; i++) {
            marginals[i] = mkMatrixRe(numBins, 1);
        }

        $.each(raw, function(i, d) {
            assignBinRe(d, bins, marginals, limits, args, 0);
        });

        var maxs = new Array(marginals.length);
        for (var i = 0; i < marginals.length; i++) {
            maxs[i] = getMaxRe(marginals[0]);
        }

        o.bins = bins;
        o.marginals = marginals;
        o.limits = limits;
        o.nmax = getMaxRe(bins);
        o.maxs = maxs;
        return o;
    }

    d3.json("mesoamerica-contours.geojson", function(json) {
        feats = json.features.sort(function(a, b) {
            return a.p.e - b.p.e;
        });
        var bounds0 = d3.geo.bounds(json),
            bounds = bounds0.map(proj),
            xscale = width / Math.abs(bounds[1][0] - bounds[0][0]),
            yscale = height / Math.abs(bounds[1][1] - bounds[0][1]),
            eles = [];

        mscale = Math.min(xscale, yscale);
        proj.scale(mscale);
        t = proj([-bounds0[0][0], -bounds0[1][1]]);
        proj.translate(t);

        if (xscale > yscale) {
            // center horizontally
            var d = xscale * Math.abs(bounds[1][0] - bounds[0][0]) -
                yscale * Math.abs(bounds[1][0] - bounds[0][0]);
            map.attr("transform", "translate(" + d / 2 + ", 0)");
        } else {
            // center vertically
            var d = yscale * Math.abs(bounds[1][1] - bounds[0][1]) -
                xscale * Math.abs(bounds[1][1] - bounds[0][1]);
            map.attr("transform", "translate(0, " + d / 2 + ")");
        }

        $.each(json.features, function(i, d) {
            if (eles.length == 0 || eles[eles.length - 1] != d.p.e) {
                eles.push(d.p.e);
            }
        });
        elebins.bins(eles).value(elef);

        shapes.append("svg:g").selectAll("path")
            .data(feats)
            .enter().append("svg:path")
            .classed("contour", true)
            .attr("stroke", function(d) {
                if (d.p.e == 0) {
                    return "#222";
                }
            })
            .attr("fill", function(d) {
                return escale(d.p.e);
            })
            .attr("d", path);

        d3.json("rain-temp-ele.geojson", function(json) {
            var descs = [];
            descs.push({
                "name": "precipitation",
                "unit": "l/m²",
                "scale": d3.scale.linear()
                    .domain([0, 250, 375, 500, 625, 750, 1000, 1500,
                        2000, 2500, 3500, 4500
                    ])
                    .range(["#c66", "#cc9b66", "#ccb766", "#fafaf0",
                        "#cc6", "#6c6", "#287728", "#94dbdb",
                        "#66c", "#b83db8", "#6b2e8a", "#1f1f5c"
                    ])
            });
            descs.push({
                "name": "temperature",
                "unit": "°C",
                "scale": d3.scale.linear()
                    .domain([0, 5, 10, 15, 20, 25, 30])
                    .range(["#8eddef", "#d2e6b1", "#cec863",
                        "#ca9368", "#e0626a", "#822732",
                        "#2e1f27"
                    ])
            });
            descs.push({
                "name": "elevation",
                "unit": "m",
                "scale": escale
            });
            sites.selectAll("circle")
                .data(json.features)
                .enter().append("svg:circle")
                .attr("r", function(d) {
                    return Math.max(1, 4 - d.p.r);
                })
                .attr("cx", function(d) {
                    return proj(d.geometry.coordinates)[0];
                })
                .attr("cy", function(d) {
                    return proj(d.geometry.coordinates)[1];
                })
                .classed("site", true)
                .on("mouseout", resetLabel);

            $("button").each(function(i, m) {
                d3.select(m).on("click", function() {
                    var t = d3.select(this);
                    if (t.attr("class") == "active") {
                        if ($("button.active").length > 1) {
                            t.attr("class", "inactive");
                            updateGraph(descs, json.features);
                        }
                    } else {
                        t.attr("class", "active");
                        updateGraph(descs, json.features);
                    }
                    resetSiteSelection();
                });
            });

            mkGraph(descs);
            mkEleGraph(descs[2], json.features);
            updateGraph(descs, json.features);

            $("#loading").fadeOut();
        });
    });
})();