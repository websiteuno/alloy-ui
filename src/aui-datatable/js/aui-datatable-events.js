// TODO - optimize code

var Lang = A.Lang,
	isArray = Lang.isArray,
	isObject = Lang.isObject,
	isValue = Lang.isValue,

	Aeach = A.Array.each,
	getObjectKeys = A.Object.keys,
	getObjectValues = A.Object.values,
	selectorTest = A.Selector.test,
	YgetClassName = A.ClassNameManager.getClassName,

	_toInitialCap = A.cached(function(str) {
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }),

	_getEvtType = A.cached(function(tagName, eventType) {
		return tagName + _toInitialCap(eventType.toLowerCase());
	}),

	BOUNDING_BOX = 'boundingBox',
	CELL = 'cell',
	CELL_SELECTOR = 'cellSelector',
	CLICK = 'click',
	COLUMN = 'column',
	EVENTS = 'events',
	HEADER = 'header',
	HOST = 'host',
	IN_HEAD = 'inHead',
	KEYDOWN = 'keydown',
	KEYUP = 'keyup',
	LINER = 'liner',
	MOUSEDOWN = 'mousedown',
	MOUSEENTER = 'mouseenter',
	MOUSELEAVE = 'mouseleave',
	MOUSEUP = 'mouseup',
	RECORDSET = 'recordset',
	ROW = 'row',
	TABLE = 'table',
	TAGS = 'tags',
	TAG_NAME = 'tagName',
	TBODY = 'tbody',
	THEAD = 'thead',
	TR = 'tr',
    DATATABLE = 'datatable',

	_COMMA = ',',
	_DOT = '.',

	CSS_DATATABLE_LINER = YgetClassName(DATATABLE, LINER);

var DataTableEvents = A.Base.create("dataTableEvents", A.Plugin.Base, [], {
	_bubbling: false,
	_handler: null,
	_tagsFilter: null,

     initializer: function(config) {
		var instance = this;
		var tags = instance.get(TAGS);

		instance._tagsFilter = getObjectKeys(tags).join(_COMMA);

		instance._initEvents();
    },

	destructor: function() {
		var instance = this;
		var handler = instance._handler;

		if (handler) {
			handler.detach();
		}
	},

	_filterBubble: function(target) {
		var instance = this;
		var host = instance.get(HOST);
		var container = host._tableNode.getDOM();

		var nodes = [];

		while (target) {
			var isContainer = (target === container);

			if (selectorTest(target, instance._tagsFilter, (isContainer ? null : container))) {
				nodes.push(target);
			}

			if (isContainer) {
				break;
			}

			target = target.parentNode;
		}

		// Adding respective col node to the nodes array in such a way
		// that the bubble order is: (td|th), tr, col, (tbody|thead) and table.
		if (nodes.length) {
			var column = host.getColNode(A.one(nodes[0]));

			if (column) {
				nodes.splice(2, 0, column.getDOM());
			}
		}

		return nodes;
	},

	_handleEvents: function(event) {
		var i, length;
		var instance = this;
		var host = instance.get(HOST);
		var thead  = host._theadNode;
		var tags = instance.get(TAGS);
		var currentTarget = event.currentTarget;
		var eventType = event.type;

		var inHead = currentTarget.getData(IN_HEAD);
		var liner = currentTarget.getData(LINER);
		var row = currentTarget.getData(ROW);

		if (!isValue(inHead)) {
			inHead = thead.contains(currentTarget);
			currentTarget.setData(IN_HEAD, inHead);
		}

		if (!isValue(liner)) {
			liner = currentTarget.one(_DOT+CSS_DATATABLE_LINER);
			currentTarget.setData(LINER, liner);
		}

		if (!isValue(row)) {
			row = currentTarget.ancestor(TR);
			currentTarget.setData(ROW, row);
		}

		var payload = {
			cell: currentTarget,
			column: host.getColumnByCell(currentTarget),
			inHead: inHead,
			liner: liner,
			originalEvent: event,
			row: row,
			record: host.get(RECORDSET).getRecordByRow(row)
		};

		var nodes = instance._filterBubble(event.currentTarget.getDOM());

		instance._bubbling = true;

		for (i = 0, length = nodes.length; (i < length) && instance._bubbling; i++) {
			var node = A.one(nodes[i]);
			var propertyName = tags[node.get(TAG_NAME).toLowerCase()];

			payload.node = node;
			payload.property = propertyName;

			host.fire(
				_getEvtType(propertyName, eventType),
				payload
			);
		}
	},

	_initEvents: function() {
		var instance = this;
		var host = instance.get(HOST);
		var tags = instance.get(TAGS);
		var events = instance.get(EVENTS);

		var publish = {};

		Aeach(getObjectValues(tags), function(propertyName) {
			Aeach(events, function(eventType) {
				var newEventType = _getEvtType(propertyName, eventType);

				publish[newEventType] = {
					stoppedFn: A.bind(instance._stopBubble, instance)
				};
			});
		});

		host.publish(publish);

		instance._handler = host.get(BOUNDING_BOX).delegate(events, A.bind(instance._handleEvents, instance), instance.get(CELL_SELECTOR));
	},

	_stopBubble: function() {
		var instance = this;

		instance._bubbling = false;
	}
},
{
    NS: "events",

    NAME: "dataTableEvents",

    ATTRS: {
		cellSelector: {
			value: 'td,th',
			writeOnce: true
		},

		events: {
			validator: isArray,
            value: [ CLICK, KEYDOWN, KEYUP, MOUSEDOWN, MOUSEENTER, MOUSELEAVE, MOUSEUP ]
        },

		tags: {
			validator: isObject,
			value: {
				col: COLUMN,
				table: TABLE,
				thead: THEAD,
				tbody: TBODY,
				tr: ROW,
				th: HEADER,
				td: CELL
			},
			writeOnce: true
		}
    }
});

A.namespace("Plugin").DataTableEvents = DataTableEvents;