shader_type canvas_item;
uniform vec4 ink0 : source_color;
uniform vec4 ink1 : source_color;
uniform vec4 ink2 : source_color;
uniform vec4 ink3 : source_color;
uniform vec4 ink4 : source_color;
void fragment() {
    vec4 src = texture(TEXTURE, UV);
    float hi = max(src.r, max(src.g, src.b));
    float lo = min(src.r, min(src.g, src.b));
    vec3 key = src.rgb / max(hi, 0.001);
    vec3 keys[5] = vec3[5](vec3(1.,0.,0.),vec3(0.,1.,0.),vec3(0.,0.,1.),vec3(1.,0.,1.),vec3(0.,1.,1.));
    vec3 inks[5] = vec3[5](ink0.rgb,ink1.rgb,ink2.rgb,ink3.rgb,ink4.rgb);
    float nearest = 99.;
    vec3 pigment = src.rgb;
    for (int i = 0; i < 5; i++) {
        float d = distance(key, keys[i]);
        if (d < nearest) { nearest = d; pigment = inks[i]; }
    }
    float weight = clamp(((hi-lo)*255.-20.)/60., 0., 1.);
    COLOR = vec4(mix(src.rgb, pigment*min(1.35,hi*1.25),weight),src.a);
}
