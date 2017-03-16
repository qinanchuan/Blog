/* @flow */
import { BorderPosition } from 'sketch-constants';
import type { SJShapeGroupLayer } from 'sketchapp-json-flow-types';
import convertToColor from '../utils/convertToColor';
import SketchRenderer from './SketchRenderer';
import { makeRect, makeColorFill, makeColorFromCSS } from '../jsonUtils/models';
import {
  makeHorizontalPath,
  makeVerticalPath,
  makeShapePath,
  makeRectShapeLayer,
  makeShapeGroup,
} from '../jsonUtils/shapeLayers';
// import processTransform from './processTransform';
import type { ViewStyle, LayoutInfo, TextStyle } from '../types';
import { makeDottedBorder, makeDashedBorder, makeShadow } from '../jsonUtils/style';
import hasAnyDefined from '../utils/hasAnyDefined';
import same from '../utils/same';

const TRANSPARENT = convertToColor('transparent');
const DEFAULT_BORDER_COLOR = '#000';
const DEFAULT_BORDER_STYLE = 'solid';

const DEFAULT_BACKGROUND_COLOR = TRANSPARENT;

const VISIBLE_STYLES = [
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderStyle',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
];

const SHADOW_STYLES = ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius'];

const makeVerticalBorder = (
  x: number,
  y: number,
  length: number,
  thickness: number,
  color,
): SJShapeGroupLayer => {
  const frame = makeRect(x, y, thickness, length);
  const shapeFrame = makeRect(0, 0, thickness, length);
  const shapePath = makeShapePath(shapeFrame, makeVerticalPath());
  const content = makeShapeGroup(frame, [shapePath]);
  content.style.borders = [
    {
      _class: 'border',
      isEnabled: true,
      color: makeColorFromCSS(color),
      fillType: 0,
      position: BorderPosition.Center,
      thickness,
    },
  ];
  return content;
};

const makeHorizontalBorder = (
  x: number,
  y: number,
  length: number,
  thickness: number,
  color,
): SJShapeGroupLayer => {
  const frame = makeRect(x, y, length, thickness);
  const shapeFrame = makeRect(0, 0, length, thickness);
  const shapePath = makeShapePath(shapeFrame, makeHorizontalPath());
  const content = makeShapeGroup(frame, [shapePath]);
  content.style.borders = [
    {
      _class: 'border',
      isEnabled: true,
      color: makeColorFromCSS(color),
      fillType: 0,
      position: BorderPosition.Center,
      thickness,
    },
  ];
  return content;
};

const findBorderStyle = (style: 'dashed' | 'dotted' | 'solid', width: number) => {
  // if (style !== undefined) {
  switch (style) {
    case 'dashed': {
      return makeDashedBorder(width);
    }
    case 'dotted': {
      return makeDottedBorder(width);
    }
    case 'solid':
      return null;
    default:
      return null;
  }
};

class ViewRenderer extends SketchRenderer {
  getDefaultGroupName() {
    return 'View';
  }
  renderBackingLayers(
    layout: LayoutInfo,
    style: ViewStyle,
    textStyle: TextStyle,
    props: any,
    // eslint-disable-next-line no-unused-vars
    value: ?string,
  ): Array<SJShapeGroupLayer> {
    const layers = [];
    // NOTE(lmr): the group handles the position, so we just care about width/height here
    const {
      borderTopWidth = 0,
      borderRightWidth = 0,
      borderBottomWidth = 0,
      borderLeftWidth = 0,

      borderTopLeftRadius = 0,
      borderTopRightRadius = 0,
      borderBottomRightRadius = 0,
      borderBottomLeftRadius = 0,

      borderTopColor = DEFAULT_BORDER_COLOR,
      borderRightColor = DEFAULT_BORDER_COLOR,
      borderBottomColor = DEFAULT_BORDER_COLOR,
      borderLeftColor = DEFAULT_BORDER_COLOR,

      borderTopStyle = DEFAULT_BORDER_STYLE,
      borderRightStyle = DEFAULT_BORDER_STYLE,
      borderBottomStyle = DEFAULT_BORDER_STYLE,
      borderLeftStyle = DEFAULT_BORDER_STYLE,
    } = style;

    if (!hasAnyDefined(style, VISIBLE_STYLES)) {
      return layers;
    }

    const backgroundColor = style.backgroundColor || DEFAULT_BACKGROUND_COLOR;

    const frame = makeRect(0, 0, layout.width, layout.height);
    const radii = [
      borderTopLeftRadius,
      borderTopRightRadius,
      borderBottomRightRadius,
      borderBottomLeftRadius,
    ];
    const shapeLayer = makeRectShapeLayer(0, 0, layout.width, layout.height, radii);

    const fill = makeColorFill(backgroundColor);
    const content = makeShapeGroup(frame, [shapeLayer], [fill]);

    if (hasAnyDefined(style, SHADOW_STYLES)) {
      content.style.shadows = [makeShadow(style)];
    }

    if (
      same(borderTopWidth, borderRightWidth, borderBottomWidth, borderLeftWidth) &&
      same(borderTopColor, borderRightColor, borderBottomColor, borderLeftColor) &&
      same(borderTopStyle, borderRightStyle, borderBottomStyle, borderLeftStyle)
    ) {
      // all sides have same border width
      // in this case, we can do everything with just a single shape.
      if (borderTopStyle !== undefined) {
        const borderOptions = findBorderStyle(borderTopStyle, borderTopWidth);
        if (borderOptions) {
          content.style.borderOptions = borderOptions;
        }
      }

      if (borderTopWidth !== undefined) {
        content.style.borders = [
          {
            _class: 'border',
            isEnabled: true,
            color: makeColorFromCSS(borderTopColor),
            fillType: 0,
            position: BorderPosition.Inside,
            thickness: borderTopWidth,
          },
        ];
      }
      layers.push(content);
    } else {
      content.hasClippingMask = true;
      layers.push(content);

      if (borderTopWidth > 0) {
        const topBorder = makeHorizontalBorder(0, 0, layout.width, borderTopWidth, borderTopColor);
        topBorder.name = 'Border (top)';

        const borderOptions = findBorderStyle(borderTopStyle, borderTopWidth);
        if (borderOptions) {
          topBorder.style.borderOptions = borderOptions;
        }

        layers.push(topBorder);
      }

      if (borderRightWidth > 0) {
        const rightBorder = makeVerticalBorder(
          layout.width - borderRightWidth,
          0,
          layout.height,
          borderRightWidth,
          borderRightColor,
        );
        rightBorder.name = 'Border (right)';

        const borderOptions = findBorderStyle(borderRightStyle, borderRightWidth);
        if (borderOptions) {
          rightBorder.style.borderOptions = borderOptions;
        }

        layers.push(rightBorder);
      }

      if (borderBottomWidth > 0) {
        const bottomBorder = makeHorizontalBorder(
          0,
          layout.height - borderBottomWidth,
          layout.width,
          borderBottomWidth,
          borderBottomColor,
        );
        bottomBorder.name = 'Border (bottom)';

        const borderOptions = findBorderStyle(borderBottomStyle, borderBottomWidth);
        if (borderOptions) {
          bottomBorder.style.borderOptions = borderOptions;
        }

        layers.push(bottomBorder);
      }

      if (borderLeftWidth > 0) {
        const leftBorder = makeVerticalBorder(
          0,
          0,
          layout.height,
          borderLeftWidth,
          borderLeftColor,
        );
        leftBorder.name = 'Border (left)';

        const borderOptions = findBorderStyle(borderLeftStyle, borderLeftWidth);
        if (borderOptions) {
          leftBorder.style.borderOptions = borderOptions;
        }

        layers.push(leftBorder);
      }

      // TODO(lmr): how do we do transform in this case?
    }
    return layers;
  }
}

module.exports = ViewRenderer;
