"""Visible sprite bounds used to attach corpse selection markers to the drawn body."""
def frame_bounds(image, fr, anims):
    result={}
    for name in ['death']:
        if name not in anims:continue
        col,count=anims[name]
        result[name]=[[image.crop(((col+i)*fr,d*fr,(col+i+1)*fr,(d+1)*fr)).getchannel('A').getbbox() for i in range(count)] for d in range(8)]
    return result
