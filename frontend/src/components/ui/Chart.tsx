import React from 'react';
import {
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  CartesianGrid,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip,
  Bar as RechartsBar,
  Line as RechartsLine,
  ResponsiveContainer,
} from 'recharts';

// Custom sleek tooltip that formats individual and group hovers beautifully
export function CustomTooltipContent({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--color-base, #FDF9F0)',
        border: '1px solid var(--color-ink, #190801)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        minWidth: '120px',
        boxShadow: '0 4px 14px rgba(25, 8, 1, 0.08)',
        pointerEvents: 'none',
      }}
    >
      {label && (
        <div
          style={{
            fontWeight: 600,
            color: 'var(--color-ink, #190801)',
            marginBottom: '6px',
            borderBottom: '1px solid rgba(25, 8, 1, 0.1)',
            paddingBottom: '3px',
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {payload.map((item: any, idx: number) => {
          const color = item.color || item.fill || 'var(--chart-1, #190801)';
          const name = item.name || item.dataKey;
          const value = item.value;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--color-text-muted, #7c7267)' }}>{name}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--color-ink, #190801)' }}>{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Stub components that user code uses as children
export function Grid(_props: any) {
  return null;
}

export function BarXAxis(_props: any) {
  return null;
}

export function XAxis(_props: any) {
  return null;
}

export function Bar(_props: any) {
  return null;
}

export function Line(_props: any) {
  return null;
}

export function ChartTooltip(_props: any) {
  return null;
}

export function SegmentBackground(_props: any) {
  return null;
}

export function SegmentLineFrom(_props: any) {
  return null;
}

export function SegmentLineTo(_props: any) {
  return null;
}

// Custom BarChart with individual bar hover interactivity
export function BarChart({
  children,
  margin,
  data,
  xDataKey,
  height = 240,
  ...props
}: any) {
  const rechartsChildren: React.ReactNode[] = [];

  React.Children.forEach(children, (child: any) => {
    if (!React.isValidElement(child)) return;

    const childType: any = child.type;
    const name = childType?.name || childType?.displayName;

    if (childType === Bar || name === 'Bar') {
      const { dataKey, lineCap, fill, name: barName, ...rest } = child.props as any;
      const barFill = fill || 'var(--chart-1, #190801)';
      rechartsChildren.push(
        <RechartsBar
          key={dataKey || `bar-${rechartsChildren.length}`}
          dataKey={dataKey}
          name={barName}
          fill={barFill}
          radius={lineCap === 'round' ? [4, 4, 0, 0] : 0}
          activeBar={{
            fillOpacity: 1,
            stroke: 'var(--color-ink, #190801)',
            strokeWidth: 1.5,
          }}
          {...rest}
        />
      );
    } else if (childType === Grid || name === 'Grid') {
      const { horizontal, vertical, ...rest } = child.props as any;
      const isHorizontal = horizontal !== undefined ? Boolean(horizontal) : true;
      const isVertical = vertical !== undefined ? Boolean(vertical) : false;
      rechartsChildren.push(
        <CartesianGrid
          key="grid"
          horizontal={isHorizontal}
          vertical={isVertical}
          strokeDasharray="3 3"
          stroke="var(--color-ink, #190801)"
          opacity={0.12}
          {...rest}
        />
      );
    } else if (childType === BarXAxis || name === 'BarXAxis' || childType === XAxis || name === 'XAxis') {
      const { dataKey, ...rest } = child.props as any;
      rechartsChildren.push(
        <RechartsXAxis
          key="xaxis"
          dataKey={dataKey || xDataKey}
          stroke="var(--color-text-muted, #7c7267)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          {...rest}
        />
      );
    } else if (childType === ChartTooltip || name === 'ChartTooltip') {
      rechartsChildren.push(
        <Tooltip
          key="tooltip"
          cursor={false}
          shared={false}
          content={<CustomTooltipContent />}
          {...(child.props as any)}
        />
      );
    }
  });

  // Ensure an XAxis exists if xDataKey was provided or in data
  const hasXAxis = rechartsChildren.some(
    (c: any) => React.isValidElement(c) && (c.type === RechartsXAxis || (c.type as any)?.displayName === 'XAxis')
  );
  if (!hasXAxis && xDataKey) {
    rechartsChildren.push(
      <RechartsXAxis
        key="xaxis-fallback"
        dataKey={xDataKey}
        stroke="var(--color-text-muted, #7c7267)"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: typeof height === 'number' ? height : 240 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={typeof height === 'number' ? height : 240}>
        <RechartsBarChart
          data={data}
          margin={margin || { top: 8, right: 8, bottom: 24, left: 8 }}
          tooltipEventType="item"
          {...props}
        >
          {rechartsChildren}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom LineChart that translates child declarations into native Recharts elements
export function LineChart({
  children,
  margin,
  data,
  xDataKey,
  height = 240,
  ...props
}: any) {
  // Auto-detect categorical X-axis key from the first data point if not explicitly specified
  let detectedXKey = xDataKey || '';
  if (!detectedXKey && Array.isArray(data) && data.length > 0) {
    const sample = data[0];
    const keys = Object.keys(sample);
    detectedXKey =
      keys.find(
        (k) =>
          typeof sample[k] === 'string' ||
          k === 'hour' ||
          k === 'day' ||
          k === 'period' ||
          k === 'month' ||
          k === 'time' ||
          k === 'name'
      ) ||
      keys[0] ||
      '';
  }

  const rechartsChildren: React.ReactNode[] = [];
  let userProvidedXAxis = false;

  React.Children.forEach(children, (child: any) => {
    if (!React.isValidElement(child)) return;

    const childType: any = child.type;
    const name = childType?.name || childType?.displayName;

    if (childType === Line || name === 'Line') {
      const { dataKey, strokeWidth, stroke, name: lineName, ...rest } = child.props as any;
      rechartsChildren.push(
        <RechartsLine
          key={dataKey || `line-${rechartsChildren.length}`}
          type="monotone"
          dataKey={dataKey}
          name={lineName}
          stroke={stroke || 'var(--chart-1, #190801)'}
          strokeWidth={strokeWidth || 2}
          dot={{ fill: 'var(--chart-2, #9A6E56)', stroke: 'var(--chart-1, #190801)', r: 4 }}
          activeDot={{ r: 6, fill: 'var(--chart-1, #190801)', stroke: 'var(--color-base, #ffffff)', strokeWidth: 2 }}
          {...rest}
        />
      );
    } else if (childType === Grid || name === 'Grid') {
      const { horizontal, vertical, ...rest } = child.props as any;
      const isHorizontal = horizontal !== undefined ? Boolean(horizontal) : true;
      const isVertical = vertical !== undefined ? Boolean(vertical) : false;
      rechartsChildren.push(
        <CartesianGrid
          key="grid"
          horizontal={isHorizontal}
          vertical={isVertical}
          strokeDasharray="3 3"
          stroke="var(--color-ink, #190801)"
          opacity={0.12}
          {...rest}
        />
      );
    } else if (childType === XAxis || name === 'XAxis' || childType === BarXAxis || name === 'BarXAxis') {
      userProvidedXAxis = true;
      const { dataKey, ...rest } = child.props as any;
      rechartsChildren.push(
        <RechartsXAxis
          key="xaxis"
          dataKey={dataKey || detectedXKey}
          stroke="var(--color-text-muted, #7c7267)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          {...rest}
        />
      );
    } else if (childType === ChartTooltip || name === 'ChartTooltip') {
      rechartsChildren.push(
        <Tooltip
          key="tooltip"
          cursor={{ stroke: 'var(--color-ink, #190801)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.3 }}
          content={<CustomTooltipContent />}
          {...(child.props as any)}
        />
      );
    }
  });

  if (!userProvidedXAxis && detectedXKey) {
    rechartsChildren.push(
      <RechartsXAxis
        key="xaxis-detected"
        dataKey={detectedXKey}
        stroke="var(--color-text-muted, #7c7267)"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: typeof height === 'number' ? height : 240 }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={typeof height === 'number' ? height : 240}>
        <RechartsLineChart
          data={data}
          margin={margin || { top: 8, right: 8, bottom: 24, left: 8 }}
          {...props}
        >
          {rechartsChildren}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
