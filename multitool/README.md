A detailed description of this example can be found at <a href="http://emptypipes.org/2017/04/29/d3v4-selectable-zoomable-force-directed-graph/">emptypipes.org/2017/04/29/d3v4-selectable-zoomable-force-directed-graph/</a>.

In summary:

1. Clicking on a node selects it and de-selects everything else.
2. Shift-clicking on a node toggles its selection status and leaves
   all other nodes as they are.
3. Shift-dragging toggles the selection status of all nodes within
   the selection area.
4. Dragging on a selected node drags all selected nodes.
5. Dragging an unselected node selects and drags it while
   de-selecting everything else.

Upgrading selectable zoomable force directed graph implementation to D3 v4 required
a few minor and not-so-minor changes.

* The new brush in v4 captures the shift, alt and meta keys to perform some
  actions by default. To get around this, I forked `d3-brush` and modified it
  so that it doesn't capture the shift events. The new version (d3-brush-lite)
  can be found [on github](https://github.com/pkerpedjiev/d3-brush-lite). There
  is an [open github issue](https://github.com/d3/d3-brush/issues/20) to
  disable this behavior in `d3-brush`.
* Because the d3-drag behavior consumes all events in v4, it is no longer
  necessary to stop propagation.
* The brush creates its own overlay which catches all events meaning that we
  don't need to turn the zoom behavior off when the shift key is pressed.
* Whether a node is fixed is specified by the `.fx` and `.fy` parameters. This
  eliminates the need to set the `.fixed` parameter on each node.
* The force layout in v4 lets us specify an [accessor for the nodes that a link
  connects](https://github.com/d3/d3-force#link_id). This lets us use ids for 
  a link's endpoint and makes the graph specification JSON easier to read:
