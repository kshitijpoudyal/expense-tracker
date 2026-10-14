import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export function Donut({
  data,
  size = 200,
  stroke = 18,
  children,
}: {
  data: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((t, d) => t + d.value, 0) || 1;
  const gap = data.length > 1 ? 4 : 0;
  const arcs = data.map((d, i) => {
    const before = data.slice(0, i).reduce((t, x) => t + x.value, 0);
    return {
      color: d.color,
      length: Math.max((d.value / total) * circumference - gap, 0.5),
      offset: (before / total) * circumference,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map((a, i) => (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={a.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${a.length} ${circumference}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </G>
      </Svg>
      {children}
    </View>
  );
}

type Series = { values: number[]; color: string; dashed?: boolean; fill?: string };

/** Line chart that sizes itself to its container. Optional y-axis labels sit on the left. */
export function LineChart({
  series,
  height = 120,
  yLabels,
  padTop = 8,
}: {
  series: Series[];
  height?: number;
  yLabels?: (value: number) => string;
  padTop?: number;
}) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.values);
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const pad = (rawMax - rawMin) * 0.15 || 1;
  const min = yLabels ? rawMin - pad : 0;
  const max = rawMax + pad;
  const longest = Math.max(...series.map((s) => s.values.length));
  const x = (i: number) => (longest <= 1 ? 0 : (i / (longest - 1)) * width);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (height - padTop);
  const ticks = [max - pad, (rawMax + rawMin) / 2, rawMin];

  return (
    <View style={styles.chartRow}>
      {yLabels ? (
        <View style={[styles.axis, { height }]}>
          {ticks.map((t, i) => (
            <Text key={i} style={[styles.axisLabel, { top: y(t) - 8 }]}>
              {yLabels(t)}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={{ flex: 1, height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {yLabels
              ? ticks.map((t, i) => (
                  <Line key={i} x1={0} x2={width} y1={y(t)} y2={y(t)} stroke={Colors.border} strokeDasharray="4 5" />
                ))
              : null}
            {series.map((s, si) => {
              const line = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
              const lastX = x(s.values.length - 1).toFixed(1);
              return (
                <G key={si}>
                  {s.fill ? <Path d={`${line} L${lastX},${height} L0,${height} Z`} fill={s.fill} /> : null}
                  <Path
                    d={line}
                    stroke={s.color}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={s.dashed ? '2 6' : undefined}
                  />
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
  axis: { width: 44 },
  axisLabel: { position: 'absolute', left: 0, fontSize: 12, color: Colors.textSecondary },
});
