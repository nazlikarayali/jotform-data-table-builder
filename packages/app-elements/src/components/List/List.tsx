import { Fragment, useState, type FC } from 'react';
import { Icon } from '../Icon/Icon';
import { Button } from '../Button';
import { Card } from '../Card';
import type { CardImageStyle, CardLayout, CardAction } from '../Card';
import './List.scss';

export type ListImageStyle = 'Square' | 'Circle' | 'None';
export type ListSize = 'Regular' | 'Compact';
export type ListLayout = 'Basic' | 'Card';
export type ListAction = 'None' | 'Icon' | 'Button';

export interface ListItemData {
  title: string;
  description: string;
  image?: string;
}

export type CardSize = 'Small' | 'Medium' | 'Large';

export interface ListProps {
  layout?: ListLayout;
  title?: string;
  showHeader?: boolean;
  // Basic layout props
  imageStyle?: ListImageStyle;
  size?: ListSize;
  action?: ListAction;
  actionIconFilled?: boolean;
  buttonLabel?: string;
  // Card layout props
  cardImageStyle?: CardImageStyle;
  cardLayout?: CardLayout;
  cardAction?: CardAction;
  cardActionIconFilled?: boolean;
  cardButtonLabel?: string;
  cardSize?: CardSize;
  // Common
  skeleton?: boolean;
  skeletonAnimation?: 'pulse' | 'shimmer';
  selected?: boolean;
  items?: ListItemData[];
  /** Show a page-navigation footer below the list. */
  showPagination?: boolean;
  /** Page size when pagination is on. Default 5. */
  itemsPerPage?: number;
}

// ============================================
// Image Placeholder
// ============================================
const ImagePlaceholder: FC<{ size: number }> = ({ size: s }) => (
  <Icon name="Image" size={s} />
);

// ============================================
// Action element (matches Card component style)
// ============================================
const ListActionEl: FC<{ action: ListAction; actionIconFilled: boolean; buttonLabel: string }> = ({ action, actionIconFilled, buttonLabel }) => {
  if (action === 'None') return null;
  if (action === 'Icon') {
    return (
      <Button
        iconOnly
        iconOnlyIcon="ChevronRight"
        iconOnlyFilled={actionIconFilled}
        corner="Default"
      />
    );
  }
  return (
    <button className="jf-card__action-button">
      {buttonLabel}
    </button>
  );
};

// ============================================
// Basic List Item
// ============================================
const BasicListItem: FC<{
  item: ListItemData;
  imageStyle: ListImageStyle;
  size: ListSize;
  action: ListAction;
  actionIconFilled: boolean;
  buttonLabel: string;
}> = ({ item, imageStyle, size, action, actionIconFilled, buttonLabel }) => {
  const isCompact = size === 'Compact';
  const imgSize = isCompact ? 60 : 104;
  const iconSize = isCompact ? 32 : 48;
  const hasImage = imageStyle !== 'None';

  return (
    <div className={`jf-list-item jf-list-item--basic${isCompact ? ' jf-list-item--compact' : ''}`}>
      {hasImage && (
        <div
          className={`jf-list-item__image jf-list-item__image--${imageStyle.toLowerCase()}${item.image ? ' jf-list-item__image--has-image' : ''}`}
          style={{
            width: imgSize,
            height: imgSize,
            backgroundImage: item.image ? `url(${item.image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!item.image && <ImagePlaceholder size={iconSize} />}
        </div>
      )}
      <div className="jf-list-item__content">
        <div className="jf-list-item__info">
          <div className="jf-list-item__title">{item.title}</div>
          <div className="jf-list-item__desc">{item.description}</div>
        </div>
        <ListActionEl action={action} actionIconFilled={actionIconFilled} buttonLabel={buttonLabel} />
      </div>
    </div>
  );
};

// ============================================
// Skeleton List Item (Basic)
// ============================================
const SkeletonListItem: FC<{ imageStyle: ListImageStyle; size: ListSize; animClass: string }> = ({ imageStyle, size, animClass }) => {
  const isCompact = size === 'Compact';
  const imgSize = isCompact ? 60 : 104;
  const hasImage = imageStyle !== 'None';

  return (
    <div className={`jf-list-item jf-list-item--basic ${animClass}${isCompact ? ' jf-list-item--compact' : ''}`}>
      {hasImage && (
        <div
          className={`jf-list-item__image jf-list-item__image--${imageStyle.toLowerCase()} jf-skeleton__bone`}
          style={{ width: imgSize, height: imgSize }}
        />
      )}
      <div className="jf-list-item__content">
        <div className="jf-list-item__info">
          <div className="jf-skeleton__bone jf-skeleton__bone jf-skeleton__line jf-skeleton__line--lg" />
          <div className="jf-skeleton__bone jf-skeleton__bone jf-skeleton__line jf-skeleton__line--sm" />
        </div>
      </div>
    </div>
  );
};

// ============================================
// Skeleton Card Item
// ============================================
const SkeletonCardItem: FC<{ cardImageStyle: CardImageStyle; cardLayout: CardLayout; animClass: string }> = ({ cardImageStyle, cardLayout, animClass }) => {
  const isVertical = cardLayout === 'Vertical';
  const hasImage = cardImageStyle !== 'None';

  const imageClass = cardImageStyle === 'Circle'
    ? (isVertical ? 'circle-card' : 'circle')
    : cardImageStyle === 'Icon'
    ? (isVertical ? 'icon-card' : 'icon')
    : (isVertical ? 'square-header' : 'square');

  if (isVertical) {
    return (
      <div className={`jf-card jf-card--skeleton jf-card--vertical ${animClass}`} style={{ background: 'var(--bg-surface)' }}>
        {hasImage && <div className={`jf-card__image jf-card__image--${imageClass} jf-skeleton__bone`} />}
        <div className="jf-card__body" style={{ background: 'var(--bg-surface)' }}>
          <div className="jf-card__content">
            <div className="jf-skeleton__bone jf-skeleton__bone jf-skeleton__line jf-skeleton__line--lg" />
            <div className="jf-skeleton__bone jf-skeleton__bone jf-skeleton__line jf-skeleton__line--sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`jf-card jf-card--skeleton jf-card--horizontal ${animClass}`} style={{ background: 'var(--bg-surface)' }}>
      {hasImage && <div className={`jf-card__image jf-card__image--${imageClass} jf-skeleton__bone`} />}
      <div className="jf-card__content">
        <div className="jf-skeleton__bone jf-skeleton__bone jf-skeleton__line jf-skeleton__line--lg" />
        <div className="jf-skeleton__bone jf-skeleton__bone jf-skeleton__line jf-skeleton__line--sm" />
      </div>
    </div>
  );
};

// ============================================
// List Component
// ============================================
const DEFAULT_ITEMS: ListItemData[] = [
  { title: 'Title 1', description: 'Description 1' },
  { title: 'Title 2', description: 'Description 2' },
  { title: 'Title 3', description: 'Description 3' },
];

export const List: FC<ListProps> = ({
  layout = 'Basic',
  title = 'List',
  showHeader = true,
  imageStyle = 'Square',
  size = 'Regular',
  action = 'None',
  actionIconFilled = true,
  buttonLabel = 'Edit',
  cardImageStyle = 'Square',
  cardLayout = 'Horizontal',
  cardAction = 'None',
  cardActionIconFilled = true,
  cardButtonLabel = 'Edit',
  cardSize = 'Medium',
  skeleton = false,
  skeletonAnimation = 'pulse',
  selected = false,
  items = DEFAULT_ITEMS,
  showPagination = false,
  itemsPerPage = 5,
}) => {
  const animClass = skeletonAnimation === 'shimmer' ? 'animate-shimmer' : 'animate-pulse';

  const header = showHeader ? (
    <div className="jf-list__heading">
      <h3 className="jf-list__title">{title}</h3>
    </div>
  ) : null;

  // Pagination — only when enabled and there's something to page (never on the
  // skeleton/loading branches). `page` may go stale when items shrink, so the
  // page actually used for slicing is clamped to the available range.
  const [page, setPage] = useState(1);
  const paginate = showPagination && !skeleton && items.length > 0;
  const perPage = Math.max(1, itemsPerPage || 5);
  const totalPages = paginate ? Math.max(1, Math.ceil(items.length / perPage)) : 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pagedItems = paginate ? items.slice((currentPage - 1) * perPage, currentPage * perPage) : items;
  const rangeStart = items.length === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const rangeEnd = Math.min(currentPage * perPage, items.length);

  const footer = paginate ? (
    <div className="jf-list__footer">
      <span className="jf-list__footer-counter">
        {`Showing ${rangeStart} to ${rangeEnd} of ${items.length}`}
      </span>
      <div className="jf-list__pagination">
        <button
          type="button"
          className="jf-list__nav"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          ‹
        </button>
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`jf-list__page${idx + 1 === currentPage ? ' jf-list__page--selected' : ''}`}
            aria-current={idx + 1 === currentPage ? 'page' : undefined}
            onClick={() => setPage(idx + 1)}
          >
            {idx + 1}
          </button>
        ))}
        <button
          type="button"
          className="jf-list__nav"
          aria-label="Next page"
          disabled={currentPage === totalPages}
          onClick={() => setPage(currentPage + 1)}
        >
          ›
        </button>
      </div>
    </div>
  ) : null;

  if (skeleton && layout === 'Card') {
    const isVertical = cardLayout === 'Vertical';
    const gridClass = isVertical
      ? `jf-list__card-grid--${cardSize.toLowerCase()}`
      : '';

    return (
      <div className={`jf-list jf-list--card${selected ? ' jf-list--selected' : ''}`}>
        {header}
        <div className={`jf-list__card-grid ${gridClass}`}>
          {items.map((_, i) => (
            <SkeletonCardItem key={i} cardImageStyle={cardImageStyle} cardLayout={cardLayout} animClass={animClass} />
          ))}
        </div>
      </div>
    );
  }

  if (skeleton) {
    return (
      <div className={`jf-list jf-list--basic${selected ? ' jf-list--selected' : ''}`}>
        {header}
        {items.map((_, i) => (
          <Fragment key={i}>
            <SkeletonListItem imageStyle={imageStyle} size={size} animClass={animClass} />
            {i < items.length - 1 && <div className="jf-list__divider" />}
          </Fragment>
        ))}
      </div>
    );
  }

  if (layout === 'Card') {
    const isVertical = cardLayout === 'Vertical';
    const gridClass = isVertical
      ? `jf-list__card-grid--${cardSize.toLowerCase()}`
      : '';

    return (
      <div className={`jf-list jf-list--card${selected ? ' jf-list--selected' : ''}`}>
        {header}
        <div className={`jf-list__card-grid ${gridClass}`}>
          {pagedItems.map((item, i) => (
            <Card
              key={i}
              imageStyle={cardImageStyle}
              layout={cardLayout}
              action={cardAction}
              actionIconFilled={cardActionIconFilled}
              imageUrl={item.image}
              title={item.title}
              description={item.description}
              buttonLabel={cardButtonLabel}
            />
          ))}
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className={`jf-list jf-list--basic${selected ? ' jf-list--selected' : ''}`}>
      {header}
      {pagedItems.map((item, i) => (
        <Fragment key={i}>
          <BasicListItem item={item} imageStyle={imageStyle} size={size} action={action} actionIconFilled={actionIconFilled} buttonLabel={buttonLabel} />
          {i < pagedItems.length - 1 && <div className="jf-list__divider" />}
        </Fragment>
      ))}
      {footer}
    </div>
  );
};

export default List;
