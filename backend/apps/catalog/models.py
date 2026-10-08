from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.core.uploads import product_image_path


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    description = models.TextField(blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class ProductQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_active=True, category__isnull=False)


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=140)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    summary = models.CharField(max_length=200, help_text="One line shown on product cards.")
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    origin = models.CharField(max_length=120, help_text="Where it is made, e.g. Rishtan, Fergana Valley.")
    materials = models.CharField(max_length=160, blank=True)
    dimensions = models.CharField(max_length=120, blank=True)
    image = models.ImageField(upload_to=product_image_path, blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    # Empty firm = sold by the store itself.
    firm = models.ForeignKey("firms.Firm", on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_products",
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active", "is_featured"])]

    def __str__(self) -> str:
        return self.name

    @property
    def in_stock(self) -> bool:
        return self.stock > 0

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:150] or "product"
            slug, n = base, 2
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)
