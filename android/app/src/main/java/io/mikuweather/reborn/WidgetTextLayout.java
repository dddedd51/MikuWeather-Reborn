package io.mikuweather.reborn;

import android.content.Context;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RemoteViews;
import android.widget.TextView;

/** Measures the real Android text rows, including CJK fallback fonts and padding. */
final class WidgetTextLayout {
    private static final int[] IDS={R.id.widget_clock,R.id.widget_temperature,R.id.widget_date,R.id.widget_weather,R.id.widget_city};

    static void apply(Context context,RemoteViews views,int layoutId,int width,int height,WidgetClockLayout plan,
            WidgetPalette palette,String temperature,String date,String weather,String city){
        float density=context.getResources().getDisplayMetrics().density;
        int outer=Math.round(plan.padding*density),insetX=Math.round(plan.insetX*density),insetY=Math.round(plan.insetY*density);
        views.setViewPadding(R.id.widget_root,outer,outer,outer,outer);
        views.setViewPadding(R.id.widget_content,insetX,insetY,insetX,insetY);
        // A full city line is reserved before sizing the upper weather stack.
        float[] sizes={plan.clock,plan.temperature,plan.date,plan.weather,Math.max(10,plan.meta)};
        String[] labels={"23:59",temperature,date,weather,city};
        View template=LayoutInflater.from(context).inflate(layoutId,null,false);
        TextView[] rows=new TextView[IDS.length];
        for(int i=0;i<IDS.length;i++){rows[i]=template.findViewById(IDS[i]);rows[i].setText(labels[i]);}
        int columnPx=Math.max(1,(int)Math.floor(plan.rightWidth*density));
        int budgetPx=Math.max(1,Math.round(height*density)-2*(outer+insetY)-(int)Math.ceil(6*density));
        float factor=1;
        if(!fits(rows,sizes,1,density,columnPx,budgetPx,plan.city)){
            float low=.1f,high=1;
            for(int i=0;i<12;i++){
                float middle=(low+high)/2;
                if(fits(rows,sizes,middle,density,columnPx,budgetPx,plan.city))low=middle;else high=middle;
            }
            factor=(float)Math.floor(low*1000)/1000;
        }
        for(int i=0;i<IDS.length;i++){
            // The footer keeps a readable font size; only the upper stack shrinks.
            float size=i==4?sizes[i]:sizes[i]*factor;
            views.setTextViewTextSize(IDS[i],TypedValue.COMPLEX_UNIT_DIP,size);
            views.setTextColor(IDS[i],i==4?palette.muted:palette.text);
            if(i>0)views.setTextViewText(IDS[i],labels[i]);
        }
        views.setViewVisibility(R.id.widget_city,plan.city?View.VISIBLE:View.GONE);
    }

    private static boolean fits(TextView[] rows,float[] sizes,float factor,float density,int width,int budget,boolean city){
        int total=0;
        for(int i=0;i<rows.length;i++){
            if(i==4&&!city)continue;
            TextView row=rows[i];row.setTextSize(TypedValue.COMPLEX_UNIT_DIP,i==4?sizes[i]:sizes[i]*factor);
            row.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
            ViewGroup.MarginLayoutParams margins=(ViewGroup.MarginLayoutParams)row.getLayoutParams();
            total+=row.getMeasuredHeight()+margins.topMargin+margins.bottomMargin;
            if(i<2&&row.getPaint().measureText(row.getText().toString())>width-2*density)return false;
        }
        return total<=budget;
    }
}
