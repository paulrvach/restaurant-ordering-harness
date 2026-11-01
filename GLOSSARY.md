# Restaurant purchasing

A restaurant turns recipes and planned servings into vendor order drafts.

## Language

**Recipe**: A named preparation with a base number of servings and measured ingredient requirements.

**Demand**: The amount of an ingredient needed for the planned servings, before selecting purchase packs.

**Inventory**: Usable ingredient stock already available to meet demand.

**Vendor offer**: One catalog row describing a purchasable product, vendor, SKU, pack quantity, quoted price and source date.
_Avoid_: Ingredient, recipe item

**Purchase pack**: The indivisible unit a vendor sells, such as one case containing six cans.

**Order draft**: A proposed set of vendor offers and purchase pack counts, with prices and unresolved questions, awaiting human review.
_Avoid_: Placed order, confirmed purchase

**Estimate**: A provisional price or quantity that requires confirmation, such as catch-weight meat or a stale quote.

**Substitution**: A proposed replacement ingredient or product form that requires the restaurant's explicit acceptance.
