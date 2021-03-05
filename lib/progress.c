#include <time.h>
#include <unistd.h>
#include <math.h>

typedef struct {
  int min, max, cur;
  long update_delay; // nanoseconds
  char prefix[512], suffix[512];
  // private
  long last_tick;
  char buf[1024];
} Progress;

long epoch_ns() {
    struct timespec ts;
    timespec_get(&ts, TIME_UTC);
    return (long)ts.tv_sec * 1000000000L + ts.tv_nsec;
}

int itoa_len(int n) {
  int len = n == 0 ? 1 : floor(log10l(labs(n)))+1;
  if (n < 0) len++;
  return len;
}

void _progress_render(Progress *p) { /* 123/456  26.97% */
  if (p->last_tick && (epoch_ns() - p->last_tick < p->update_delay)) return;

  double percent = (p->cur/(p->max+0.0))*100;
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  int max_len = itoa_len(p->max);
  snprintf(p->buf, sizeof(p->buf), "%s%*d/%d %6.2f%%%s",
           p->prefix,  max_len,  p->cur, p->max, percent, p->suffix);

  fprintf(stderr, isatty(2) ? "\33[2K\r%s" : "%s\n", p->buf);
  p->last_tick = epoch_ns();
}

Progress* progress_init(int min, int max) {
  Progress *p = (Progress*)malloc(sizeof(Progress));
  p->min = min; p->max = max;
  p->update_delay = 100000000; // 100 ms
  p->last_tick = 0;
  strcpy(p->prefix, ""); strcpy(p->suffix, "");
  return p;
}

void progress_update(Progress *p, int cur) {
  if (!p) return;
  p->cur = cur;
  _progress_render(p);
}

void progress_end(Progress **p) {
  if ( !(p && *p)) return;
  (*p)->update_delay = 0;
  _progress_render(*p); // presumably draw "100%"
  free(*p);
  *p = NULL;
}
